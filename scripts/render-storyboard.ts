import { renderStoryboardToMp4 } from "@/lib/remotion/render";

const storyboardId = process.argv[2];

if (!storyboardId) {
  console.error("Usage: npm run render:storyboard -- <storyboardId>");
  process.exit(1);
}

renderStoryboardToMp4(storyboardId)
  .then((render) => {
    console.log(`Rendered ${render.id}: ${render.filePath}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
