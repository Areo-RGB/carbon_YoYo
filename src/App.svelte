<script lang="ts">
  import {
    Header,
    HeaderNav,
    HeaderNavItem,
    SideNav,
    SideNavItems,
    SideNavLink,
    Content,
    SkipToContent,
  } from 'carbon-components-svelte';
  import AppHeader from './lib/components/AppHeader.svelte';
  import BottomNav from './lib/components/BottomNav.svelte';
  import HomeScreen from './lib/screens/HomeScreen.svelte';
  import RosterScreen from './lib/screens/RosterScreen.svelte';
  import LiveScreen from './lib/screens/LiveScreen.svelte';
  import ResultsScreen from './lib/screens/ResultsScreen.svelte';
  import ProtocolScreen from './lib/screens/ProtocolScreen.svelte';
  import HistoryScreen from './lib/screens/HistoryScreen.svelte';
  import SyncScreen from './lib/screens/SyncScreen.svelte';
  import SettingsScreen from './lib/screens/SettingsScreen.svelte';
  import Home from 'carbon-icons-svelte/lib/Home.svelte';
  import UserMultiple from 'carbon-icons-svelte/lib/UserMultiple.svelte';
  import Activity from 'carbon-icons-svelte/lib/Activity.svelte';
  import Trophy from 'carbon-icons-svelte/lib/Trophy.svelte';
  import Document from 'carbon-icons-svelte/lib/Document.svelte';
  import Time from 'carbon-icons-svelte/lib/Time.svelte';
  import Wifi from 'carbon-icons-svelte/lib/Wifi.svelte';
  import Settings from 'carbon-icons-svelte/lib/Settings.svelte';
  import type { Component } from 'svelte';
  import { activeTab, selectedTestType, navItems } from './lib/state/app.ts';
  import { setSelectedTestType } from './lib/state/testStore.ts';
  import type { AppTab } from './domain/models.ts';
  import type { TestType } from './domain/protocol.ts';

  let isSideNavOpen = $state(false);

  // Icons for the rail's narrow (collapsed) icon-only state.
  const navIcons: Record<AppTab, Component<any>> = {
    startup: Home,
    setup: UserMultiple,
    live: Activity,
    leaderboard: Trophy,
    tabelle: Document,
    history: Time,
    sync: Wifi,
    settings: Settings,
  };

  function navigate(tab: AppTab) {
    activeTab.set(tab);
    isSideNavOpen = false;
  }

  function changeTestType(type: TestType) {
    setSelectedTestType(type);
  }
</script>

<SkipToContent />
<Header companyName="Yo-Yo" platformName="Fitness Tracker" bind:isSideNavOpen>
  <HeaderNav>
    <HeaderNavItem
      text="Yo-Yo IR1"
      isSelected={$selectedTestType === 'yoyoIR1'}
      on:click={() => changeTestType('yoyoIR1')}
    />
    <HeaderNavItem
      text="Beep Test"
      isSelected={$selectedTestType === 'beepTest'}
      on:click={() => changeTestType('beepTest')}
    />
  </HeaderNav>
</Header>

<SideNav bind:isOpen={isSideNavOpen}>
  <SideNavItems>
    {#each navItems as item}
      <SideNavLink
        icon={navIcons[item.id]}
        text={item.label}
        isSelected={$activeTab === item.id}
        on:click={() => navigate(item.id)}
      />
    {/each}
  </SideNavItems>
</SideNav>

<Content>
  <!-- Compact protocol switcher for small screens; the Header nav covers desktop. -->
  <div class="carbon-protocol-row">
    <AppHeader testType={$selectedTestType} onTestTypeChange={changeTestType} />
  </div>
  <main>
    {#if $activeTab === 'startup'}
      <HomeScreen />
    {:else if $activeTab === 'setup'}
      <RosterScreen />
    {:else if $activeTab === 'live'}
      <LiveScreen />
    {:else if $activeTab === 'leaderboard'}
      <ResultsScreen />
    {:else if $activeTab === 'tabelle'}
      <ProtocolScreen testType={$selectedTestType} />
    {:else if $activeTab === 'history'}
      <HistoryScreen />
    {:else if $activeTab === 'sync'}
      <SyncScreen />
    {:else}
      <SettingsScreen />
    {/if}
  </main>
</Content>

<BottomNav active={$activeTab} onSelect={navigate} />
