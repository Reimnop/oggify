<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from "mode-watcher";
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />

	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap"
		rel="stylesheet"
	/>

	<title>Convert audio to OGG</title>
	<meta name="title" content="Convert audio to OGG" />
	<meta name="description" content="Instantly turn your audio files into OGG Vorbis. 100% local." />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://ogg.reimnop.com/" />
	<meta property="og:title" content="Convert audio to OGG" />
	<meta property="og:description" content="Instantly turn your audio files into OGG Vorbis. 100% local." />

	<!-- Twitter -->
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:url" content="https://ogg.reimnop.com/" />
	<meta property="twitter:title" content="Convert audio to OGG" />
	<meta
		property="twitter:description"
		content="Instantly turn your audio files into OGG Vorbis. 100% local."
	/>
</svelte:head>

<ModeWatcher />

{@render children()}
