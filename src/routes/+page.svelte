<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import * as Item from "$lib/components/ui/item";
  import { Progress } from "$lib/components/ui/progress";
  import { Separator } from "$lib/components/ui/separator";
  import { Spinner } from "$lib/components/ui/spinner";
  import { FFmpeg } from "@ffmpeg/ffmpeg";
  import { fetchFile, toBlobURL } from "@ffmpeg/util";
  import JSZip from "jszip";
  import { onDestroy, onMount } from "svelte";

  type QueuedFile = {
    id: string;
    file: File;
    status: "pending" | "converting" | "done" | "error";
    progress: number;
    outputUrl?: string;
    outputSize?: number;
  };

  let ffmpeg: FFmpeg;
  let isLoaded = $state(false);
  let isProcessingQueue = $state(false);
  let fileQueue: QueuedFile[] = $state([]);

  onMount(async () => {
    console.log("123123123");
    ffmpeg = new FFmpeg();

    const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript")
    });

    isLoaded = true;
  });

  onDestroy(() => {
    ffmpeg?.terminate();
  });

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files) {
      return;
    }

    const newFiles = Array.from(target.files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "pending" as const,
      progress: 0
    }));

    fileQueue.push(...newFiles);
    target.value = "";
  }

  async function startBatchProcess() {
    if (isProcessingQueue) {
      return;
    }

    isProcessingQueue = true;
    for (let i = 0; i < fileQueue.length; i++) {
      if (fileQueue[i].status === "pending") {
        await convertSingleFile(i);
      }
    }
    isProcessingQueue = false;
  }

  async function convertSingleFile(index: number) {
    const queuedItem = fileQueue[index];
    const inputName = `input_${queuedItem.id}`;
    const outputName = `output_${queuedItem.id}.ogg`;

    fileQueue[index].status = "converting";
    const progressHandler = (event: { progress: number }) => {
      let cleanProgress = event.progress;
      if (isNaN(cleanProgress) || cleanProgress < 0) {
        cleanProgress = 0;
      } else if (cleanProgress > 1) {
        cleanProgress = 1;
      }

      fileQueue[index].progress = Math.round(cleanProgress * 100);
    };
    ffmpeg.on("progress", progressHandler);

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(queuedItem.file));
      await ffmpeg.exec([
        "-i",
        inputName,
        "-vn",
        "-c:a",
        "libvorbis",
        "-q:a",
        "4",
        "-ar",
        "44100",
        "-map_metadata",
        "-1",
        "-y",
        "-stats_period",
        "0.1",
        outputName
      ]);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data as BlobPart], { type: "audio/ogg" });

      fileQueue[index].status = "done";
      fileQueue[index].outputUrl = URL.createObjectURL(blob);
      fileQueue[index].outputSize = data.length;
    } catch (error) {
      console.error(`Failed to convert ${queuedItem.file.name}:`, error);
      fileQueue[index].status = "error";
    } finally {
      ffmpeg.off("progress", progressHandler);
      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch (e) {
        console.error("Failed to delete temporary files:", e);
      }
    }
  }

  async function downloadAllAsZip() {
    const zip = new JSZip();
    const completedItems = fileQueue.filter((item) => item.status === "done" && item.outputUrl);

    if (completedItems.length === 0) return;

    for (const item of completedItems) {
      const response = await fetch(item.outputUrl!);
      const blob = await response.blob();
      const name = `${splitFileName(item.file.name).name}.ogg`;
      zip.file(name, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const zipUrl = URL.createObjectURL(content);

    const link = document.createElement("a");
    link.href = zipUrl;
    link.download = "songs.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(zipUrl);
  }

  function toFileSize(size: number) {
    return (size / 1024 / 1024).toFixed(2);
  }

  function splitFileName(filename: string) {
    const parts = filename.split(".");
    const extension = parts.pop();
    const name = parts.join(".");
    if (name === "" && extension !== undefined) {
      return { name: "", extension: extension };
    }

    return { name, extension };
  }
</script>

<div class="flex min-h-svh flex-col">
  <header class="space-y-2.5 text-center">
    <h1 class="mt-8 text-4xl font-bold">Convert audio to OGG</h1>
    <p>Instantly turn your audio files into OGG Vorbis. 100% local.</p>
  </header>

  <main class="mt-4 p-4">
    <Card.Root class="mx-auto w-full max-w-xl p-5">
      <div class="flex flex-col gap-4">
        <Field.Field>
          <Field.Label for="upload">Add songs to convert</Field.Label>
          <Input
            id="upload"
            type="file"
            accept="audio/*"
            multiple
            onchange={handleFileSelect}
            disabled={isProcessingQueue}
          />
        </Field.Field>
        {#if fileQueue.length}
          <section>
            <h2 class="font-bold">Queue</h2>
            <div class="mt-4 flex flex-col gap-2">
              {#each fileQueue as item (item.id)}
                <article>
                  <Item.Root variant="muted">
                    <Item.Content>
                      <Item.Title>
                        {@const { name, extension } = splitFileName(item.file.name)}
                        <div class="flex items-center">
                          <span>{name}</span>
                          {#if item.status === "done"}
                            <span class="font-semibold">.ogg</span>
                          {:else}
                            <span>.{extension}</span>
                          {/if}
                        </div>
                      </Item.Title>
                      <Item.Description>
                        {#if item.status === "done" && item.outputSize}
                          <span class="line-through opacity-75">{toFileSize(item.file.size)}</span>
                          <span>{toFileSize(item.outputSize)} MB</span>
                        {:else}
                          {toFileSize(item.file.size)} MB
                        {/if}
                      </Item.Description>
                    </Item.Content>
                    <Item.Actions>
                      {#if isProcessingQueue && ["converting", "pending"].includes(item.status)}
                        <div class="flex items-center gap-2">
                          <Progress class="w-10" value={item.progress} />
                          <p class="w-6 text-center font-mono text-sm text-muted-foreground">
                            {item.progress}%
                          </p>
                        </div>
                      {:else if item.status === "error"}
                        <span class="text-sm font-medium text-destructive">Failed</span>
                      {:else if item.status === "done" && item.outputUrl}
                        <a
                          href={item.outputUrl}
                          download="{splitFileName(item.file.name).name}.ogg"
                        >
                          <Button size="sm">Download</Button>
                        </a>
                      {/if}
                    </Item.Actions>
                  </Item.Root>
                </article>
              {/each}
            </div>
          </section>
        {/if}
        <section class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <Button
              class="w-fit"
              disabled={!isLoaded ||
                isProcessingQueue ||
                !fileQueue.length ||
                !fileQueue.some((i) => i.status !== "done")}
              onclick={startBatchProcess}
            >
              Convert
            </Button>
            {#if !isLoaded}
              <div class="flex items-center gap-2 text-muted-foreground">
                <Spinner />
                <span class="text-sm">Loading FFmpeg...</span>
              </div>
            {/if}
          </div>
          <div class="flex items-center gap-2.5">
            <Button
              variant="secondary"
              disabled={isProcessingQueue || !fileQueue.some((i) => i.status === "done")}
              onclick={downloadAllAsZip}
            >
              Download all
            </Button>
          </div>
        </section>
      </div>
    </Card.Root>
  </main>

  <footer class="mt-auto">
    <Separator />
    <p class="py-4 text-center text-sm text-muted-foreground">
      Made by Reimnop and enchart.
      <br />
      <a class="underline" href="https://github.com/Reimnop/oggify">Source code</a>
    </p>
  </footer>
</div>
