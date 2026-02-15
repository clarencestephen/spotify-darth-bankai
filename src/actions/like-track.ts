import streamDeck, { action, type KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { spotifyAuth } from "../spotify-auth";
import { getCurrentTrack, areItemsSaved, saveToLibrary, removeFromLibrary } from "../spotify-api";

const logger = streamDeck.logger.createScope("LikeTrack");

@action({ UUID: "com.cognosis.spotify-controller.like-track" })
export class LikeTrackAction extends SingletonAction {

  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    if (!spotifyAuth.isAuthorized) {
      await ev.action.setTitle("Auth\nFirst!");
      await ev.action.showAlert();
      return;
    }

    try {
      const cur = await getCurrentTrack();
      if (!cur?.item) {
        await ev.action.setTitle("No\nTrack");
        await ev.action.showAlert();
        return;
      }

      // Check current like state on every press
      const [isLiked] = await areItemsSaved([cur.item.uri]);

      if (isLiked) {
        await removeFromLibrary([cur.item.uri]);
        await ev.action.setState(0);
        await ev.action.setTitle("Unliked");
        logger.info(`Unliked: ${cur.item.name}`);
      } else {
        await saveToLibrary([cur.item.uri]);
        await ev.action.setState(1);
        await ev.action.setTitle("Liked!");
        logger.info(`Liked: ${cur.item.name}`);
      }
      await ev.action.showOk();

      setTimeout(async () => {
        try { await ev.action.setTitle(""); } catch {}
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Like toggle error: ${msg}`);
      await ev.action.setTitle("Error");
      await ev.action.showAlert();
      setTimeout(async () => {
        try { await ev.action.setTitle(""); } catch {}
      }, 2000);
    }
  }
}
