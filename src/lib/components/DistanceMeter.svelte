<script lang="ts">
  import { ProgressBar, Tag, Tile } from 'carbon-components-svelte';
  import { getProtocol } from '../../domain/protocol.ts';
  import { elapsedMs, runtime, testState } from '../state/testStore.ts';
  import { selectedTestType } from '../state/app.ts';

  const protocol = $derived(getProtocol($selectedTestType));
  const stateType = $derived(
    $testState === 'running'
      ? 'green'
      : $testState === 'paused'
        ? 'purple'
        : $testState === 'completed'
          ? 'blue'
          : 'gray'
  );

  function formatTime(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
</script>

<Tile class="meter-tile">
  <div class="meter-top">
    <div class="meter-state">
      <Tag type={stateType}>{$testState.toUpperCase()}</Tag>
      <strong>{protocol.displayName}</strong>
    </div>
    <span class="meter-clock">{formatTime($elapsedMs)}</span>
  </div>

  <div class="distance-number">{$runtime.currentDistanceMeters.toLocaleString()}</div>
  <div class="meters-label">METERS</div>

  <ProgressBar
    value={$runtime.currentDistanceMeters}
    max={protocol.maxDistanceMeters}
    labelText="Protocol progress"
    helperText={`${$runtime.shuttle.levelDisplay} · shuttle ${$runtime.shuttle.shuttleNumber} of ${protocol.shuttles.length}`}
  />

  <div class="stat-grid">
    <Tile light class="stat-tile">
      <span>Level</span><strong>{$runtime.shuttle.levelDisplay}</strong>
    </Tile>
    <Tile light class="stat-tile">
      <span>Speed</span><strong>{$runtime.shuttle.speedKmh.toFixed(1)} <small>km/h</small></strong>
    </Tile>
    <Tile light class="stat-tile">
      <span>Shuttle</span><strong>{$runtime.shuttle.shuttleNumber}<small>/{protocol.shuttles.length}</small></strong>
    </Tile>
    <Tile light class="stat-tile">
      <span>{$runtime.phase === 'running' ? 'Run time' : 'Rest time'}</span><strong>{$runtime.phaseRemainingSeconds.toFixed(1)} <small>s</small></strong>
    </Tile>
  </div>
</Tile>
