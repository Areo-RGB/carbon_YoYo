<script lang="ts">
  import ScreenTitle from '../components/ScreenTitle.svelte';
  import { getProtocol } from '../../domain/protocol.ts';
  import type { TestType } from '../../domain/protocol.ts';
  interface Props { testType: TestType }
  let { testType }: Props = $props();
  let protocol = $derived(getProtocol(testType));
</script>
<section class="screen">
  <ScreenTitle eyebrow="Reference" title="Protocol table" description="Uses the existing corrected protocol definition rather than hard-coded UI data." />
  <div class="panel protocol-summary"><strong>{protocol.displayName}</strong><span>{protocol.shuttles.length} scheduled shuttle events</span></div>
  <div class="panel table-wrap"><table><thead><tr><th>#</th><th>Level</th><th>Speed</th><th>Distance</th></tr></thead><tbody>{#each protocol.shuttles.slice(0, 24) as shuttle}<tr><td>{shuttle.shuttleNumber}</td><td>{shuttle.levelDisplay}</td><td>{shuttle.speedKmh.toFixed(1)} km/h</td><td>{shuttle.cumulativeDistanceMeters} m</td></tr>{/each}</tbody></table></div>
</section>
