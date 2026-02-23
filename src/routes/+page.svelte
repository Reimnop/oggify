<script lang="ts">
	import * as Card from "$lib/components/ui/card/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { FFmpeg } from "@ffmpeg/ffmpeg";
	import { toBlobURL } from "@ffmpeg/util";
	import { onMount } from 'svelte';

	let files: FileList | undefined = $state(undefined);
	let ffmpeg: FFmpeg | null = $state(null);

	let processing = $state(false);

	onMount(() => {
		loadFFmpeg();
	});

	async function loadFFmpeg() {
		if (ffmpeg !== null)
			return;

		const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

		const tempFFmpeg = new FFmpeg();
		tempFFmpeg.on("log", ({ message }) => console.log(message));

		await	tempFFmpeg.load({
			coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
			wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
		});

		ffmpeg = tempFFmpeg;
	}

	async function onButtonClicked() {
		if (ffmpeg === null || files === undefined || files.length === 0)
			return;

		const file = files[0];

		const fileExt = file.name.split(".").slice(-1)[0];

		const inputFileName = `input.${fileExt}`;
		const outputFileName = `output.ogg`;

		processing = true;

		let data: Uint8Array | null = null;
		try {
			await ffmpeg.writeFile(inputFileName, await file.bytes());
			await ffmpeg.exec(["-i", inputFileName, "-c:a", "libvorbis", outputFileName]);
			data = await ffmpeg.readFile(outputFileName) as Uint8Array;
		} finally {
			processing = false;
		}

		if (data === null)
		{
			console.error("Failed to convert file, operation aborted");
			return;
		}

		const url = URL.createObjectURL(new Blob([data as BlobPart], { type: "audio/ogg" }));
		try {
			const a = document.createElement("a");
			a.href = url;
			a.download = `${file.name.split(".").slice(0, -1).join(".")}_converted.ogg`;
			a.click();
		} finally {
			URL.revokeObjectURL(url);
		}
	}

</script>

<div class="w-full min-h-screen flex flex-col gap-4 items-center px-8">
	<h1 class="font-bold text-4xl mt-8">Convert audio to OGG</h1>
	<p>Instantly turn your audio files into OGG Vorbis. 100% local.</p>
	<Card.Root class="w-full max-w-md">
		<Card.Content>
			<div class="flex flex-col gap-4">
				{#if ffmpeg !== null}
					<div>
						<p class="font-bold mb-2">Pick file</p>
						<Input class="cursor-pointer w-full" type="file" accept="audio/*" bind:files={files} />
					</div>

					{#if files}
						<Button class="cursor-pointer w-full" disabled={processing} onclick={onButtonClicked}>
							Convert & Download
							{#if processing}
								<svg xmlns="http://www.w3.org/2000/svg"
										 width="24"
										 height="24"
										 viewBox="0 0 24 24"
										 fill="none"
										 stroke="currentColor"
										 stroke-width="2"
										 stroke-linecap="round"
										 stroke-linejoin="round"
										 role="status"
										 aria-label="Loading"
										 class="animate-spin">
									<path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
								</svg>
							{/if}
						</Button>
					{/if}
				{:else}
					<p>Loading...</p>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
</div>