import { mount } from 'svelte';
import 'carbon-components-svelte/css/white.css';
import App from './App.svelte';
import './styles.css';

mount(App, { target: document.getElementById('root')! });
