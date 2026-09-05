package com.yoyo.fitness

import android.content.Context
import android.os.Build
import android.util.Log
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.AdvertisingOptions
import com.google.android.gms.nearby.connection.ConnectionInfo
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback
import com.google.android.gms.nearby.connection.ConnectionResolution
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback
import com.google.android.gms.nearby.connection.Payload
import com.google.android.gms.nearby.connection.PayloadCallback
import com.google.android.gms.nearby.connection.PayloadTransferUpdate
import com.google.android.gms.nearby.connection.Strategy
import java.nio.charset.StandardCharsets
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * Google Nearby Connections transport for the tablet-host / remote-phone sync.
 * One service ID, P2P_CLUSTER strategy: the tablet advertises, phones discover,
 * connect, receive live state and send back miss/eliminate actions.
 *
 * Payloads are small BYTES messages with a text prefix:
 * - "STATE:{...}" host -> phones (latest test snapshot)
 * - "ACTION:{...}" phones -> host (queued for the host to drain)
 */
class NearbySyncManager(context: Context) {

    interface Logger {
        fun e(tag: String, message: String, t: Throwable?)
        fun d(tag: String, message: String)
    }

    interface DiscoveryListener {
        fun onEndpointFound(endpointId: String, name: String)
        fun onEndpointLost(endpointId: String)
    }

    interface ConnectionListener {
        fun onResult(endpointId: String, ok: Boolean, message: String)
    }

    companion object {
        const val SERVICE_ID = "com.yoyo.fitness.sync"
        private const val TAG = "YoYoNearby"
        private const val PREFIX_STATE = "STATE:"
        private const val PREFIX_ACTION = "ACTION:"
        private const val PREFIX_COMMAND = "COMMAND:"
        private const val PREFIX_RESULT = "RESULT:"
    }

    private val client: ConnectionsClient = Nearby.getConnectionsClient(context.applicationContext)
    private val endpointName: String = "${Build.MANUFACTURER} ${Build.MODEL}".trim()
    private val log: Logger = object : Logger {
        override fun e(tag: String, message: String, t: Throwable?) {
            Log.e(tag, message, t)
        }

        override fun d(tag: String, message: String) {
            Log.d(tag, message)
        }
    }

    // ---- host side ----
    private val remoteEndpoints = ConcurrentHashMap.newKeySet<String>()
    private val inboundActions = ConcurrentLinkedQueue<String>()
    @Volatile var hosting = false
        private set

    // ---- phone side ----
    @Volatile var latestRemoteState: String = "{}"
        private set
    @Volatile var connectedEndpoint: String? = null
        private set
    private val inboundResults = ConcurrentLinkedQueue<String>()
    private var pendingConnection: ConnectionListener? = null

    private val lifecycleCallback = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            // Same-app use case: accept without showing the auth token UI.
            log.d(TAG, "Connection initiated by ${info.endpointName} ($endpointId)")
            client.acceptConnection(endpointId, payloadCallback)
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            if (result.status.isSuccess) {
                log.d(TAG, "Connected to $endpointId")
                if (hosting) {
                    remoteEndpoints.add(endpointId)
                } else {
                    connectedEndpoint = endpointId
                }
                pendingConnection?.onResult(endpointId, true, "Connected")
            } else {
                log.e(TAG, "Connection to $endpointId failed: ${result.status}", null)
                pendingConnection?.onResult(endpointId, false, "Connection failed (${result.status.statusCode}).")
            }
            pendingConnection = null
        }

        override fun onDisconnected(endpointId: String) {
            log.d(TAG, "Disconnected $endpointId")
            remoteEndpoints.remove(endpointId)
            if (connectedEndpoint == endpointId) connectedEndpoint = null
        }
    }

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            if (payload.type != Payload.Type.BYTES || payload.asBytes() == null) return
            val text = String(payload.asBytes()!!, StandardCharsets.UTF_8)
            when {
                text.startsWith(PREFIX_STATE) -> latestRemoteState = text.removePrefix(PREFIX_STATE)
                text.startsWith(PREFIX_ACTION) -> inboundActions.add(text.removePrefix(PREFIX_ACTION))
                text.startsWith(PREFIX_COMMAND) -> inboundActions.add(text.removePrefix(PREFIX_COMMAND))
                text.startsWith(PREFIX_RESULT) -> inboundResults.add(text.removePrefix(PREFIX_RESULT))
            }
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
            // bytes payloads need no progress handling
        }
    }

    private val discoveryCallback = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            log.d(TAG, "Found ${info.endpointName} ($endpointId)")
            discoveryListener?.onEndpointFound(endpointId, info.endpointName)
        }

        override fun onEndpointLost(endpointId: String) {
            discoveryListener?.onEndpointLost(endpointId)
        }
    }

    @Volatile private var discoveryListener: DiscoveryListener? = null

    // ================= host =================

    fun startHosting() {
        stopHosting()
        hosting = true
        val options = AdvertisingOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()
        client.startAdvertising(endpointName, SERVICE_ID, lifecycleCallback, options)
            .addOnSuccessListener { log.d(TAG, "Advertising as $endpointName") }
            .addOnFailureListener { e ->
                hosting = false
                log.e(TAG, "Advertising failed", e)
            }
    }

    fun broadcastState(stateJson: String) {
        if (!hosting || remoteEndpoints.isEmpty()) return
        val bytes = (PREFIX_STATE + stateJson).toByteArray(StandardCharsets.UTF_8)
        client.sendPayload(remoteEndpoints.toList(), Payload.fromBytes(bytes))
    }

    fun broadcastResult(resultJson: String) {
        if (!hosting || remoteEndpoints.isEmpty()) return
        val bytes = (PREFIX_RESULT + resultJson).toByteArray(StandardCharsets.UTF_8)
        client.sendPayload(remoteEndpoints.toList(), Payload.fromBytes(bytes))
    }

    /** Drain actions posted by connected phones. */
    fun drainActions(): List<String> {
        val out = mutableListOf<String>()
        while (true) out.add(inboundActions.poll() ?: break)
        return out
    }

    fun connectedPhoneCount(): Int = remoteEndpoints.size

    fun stopHosting() {
        hosting = false
        remoteEndpoints.clear()
        try {
            client.stopAdvertising()
            client.stopAllEndpoints()
        } catch (e: Exception) {
            log.e(TAG, "stopHosting failed", e)
        }
    }

    // ================= phone =================

    fun startDiscovery(listener: DiscoveryListener) {
        discoveryListener = listener
        val options = DiscoveryOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()
        client.startDiscovery(SERVICE_ID, discoveryCallback, options)
            .addOnSuccessListener { log.d(TAG, "Discovering tablets") }
            .addOnFailureListener { e -> log.e(TAG, "Discovery failed", e) }
    }

    fun stopDiscovery() {
        discoveryListener = null
        try {
            client.stopDiscovery()
        } catch (e: Exception) {
            log.e(TAG, "stopDiscovery failed", e)
        }
    }

    fun connectToTablet(endpointId: String, listener: ConnectionListener) {
        pendingConnection = listener
        client.requestConnection(endpointName, endpointId, lifecycleCallback)
            .addOnFailureListener { e ->
                pendingConnection = null
                listener.onResult(endpointId, false, "Request failed: ${e.message}")
            }
    }

    fun sendAction(actionJson: String) {
        val endpointId = connectedEndpoint
            ?: throw IllegalStateException("Not connected to the tablet.")
        val bytes = (PREFIX_ACTION + actionJson).toByteArray(StandardCharsets.UTF_8)
        client.sendPayload(endpointId, Payload.fromBytes(bytes))
    }

    fun sendRemoteCommand(commandJson: String) {
        val endpointId = connectedEndpoint
            ?: throw IllegalStateException("Not connected to the tablet.")
        val bytes = (PREFIX_COMMAND + commandJson).toByteArray(StandardCharsets.UTF_8)
        client.sendPayload(endpointId, Payload.fromBytes(bytes))
    }

    /** Drain command execution results posted by tablet host. */
    fun drainResults(): List<String> {
        val out = mutableListOf<String>()
        while (true) out.add(inboundResults.poll() ?: break)
        return out
    }

    fun disconnectTablet() {
        connectedEndpoint?.let {
            try {
                client.disconnectFromEndpoint(it)
            } catch (e: Exception) {
                log.e(TAG, "disconnect failed", e)
            }
            connectedEndpoint = null
        }
        stopDiscovery()
    }
}
