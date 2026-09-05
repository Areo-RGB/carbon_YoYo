<script lang="ts">import ScreenTitle from '$lib/components/ScreenTitle.svelte';</script>
<section class="screen">
  <ScreenTitle eyebrow="Archive" title="Test history" description="Session cards and detail navigation live here; persistence is handled via localStorage." />
  <div class="empty-state"><strong>No scaffold sessions yet</strong><p>Connect this screen to <code>services/persistence.ts</code> and the existing TestSession model.</p></div>
</section>
