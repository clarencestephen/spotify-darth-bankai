import streamDeck, {
  action,
  type KeyDownEvent,
  SingletonAction,
  type DidReceiveSettingsEvent,
  type SendToPluginEvent,
} from "@elgato/streamdeck";
import type { JsonObject, JsonValue } from "@elgato/utils";
import { spotifyAuth } from "../spotify-auth";
import { getCurrentTrack, addItemsToPlaylist, removeItemsFromPlaylist, isTrackInPlaylist } from "../spotify-api";
import { handlePlaylistPI } from "./playlist-pi-handler";

const logger = streamDeck.logger.createScope("AddToPlaylist");

type Settings = { playlistId?: string; playlistName?: string };

@action({ UUID: "com.cognosis.spotify-controller.add-to-playlist" })
export class AddToPlaylistAction extends SingletonAction {

  private inPlaylist = false;
  private lastTrackUri: string | null = null;

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent): Promise<void> {
    // Reset when playlist selection changes
    this.inPlaylist = false;
    this.lastTrackUri = null;
  }

  override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, JsonObject>): Promise<void> {
    await handlePlaylistPI(ev.payload as Record<string, unknown>);
  }

  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    if (!spotifyAuth.isAuthorized) {
      await ev.action.setTitle("Auth\nFirst!");
      await ev.action.showAlert();
      return;
    }

    const s = (ev.payload.settings ?? {}) as Settings;
    if (!s.playlistId) {
      await ev.action.setTitle("Set\nPlaylist");
      await ev.action.showAlert();
      return;
    }

    try {
      const cur = await getCurrentTrack();
      if (!cur?.item) { await ev.action.setTitle("No\nTrack"); await ev.action.showAlert(); return; }

      const trackName = trunc(cur.item.name, 12);

      // If track changed since last press, reset state
      if (cur.item.uri !== this.lastTrackUri) {
        this.inPlaylist = false;
        this.lastTrackUri = cur.item.uri;
      }

      if (this.inPlaylist) {
        // Removal icon showing — REMOVE from playlist
        await removeItemsFromPlaylist(s.playlistId, [cur.item.uri]);
        this.inPlaylist = false;
        await ev.action.setState(0);
        await ev.action.setTitle(`Removed\n${trackName}`);
        await ev.action.showOk();
        logger.info(`Removed from playlist: ${cur.item.name}`);
      } else {
        // Add icon showing — check for duplicates first
        const alreadyIn = await isTrackInPlaylist(s.playlistId, cur.item.uri);
        if (alreadyIn) {
          this.inPlaylist = true;
          await ev.action.setState(1);
          await ev.action.setTitle(`Already\nOn List`);
          await ev.action.showAlert();
          logger.info(`Already in playlist: ${cur.item.name}`);
          setTimeout(async () => { try { await ev.action.setTitle(""); } catch {} }, 2500);
          return;
        }

        await addItemsToPlaylist(s.playlistId, [cur.item.uri]);
        this.inPlaylist = true;
        await ev.action.setState(1);
        await ev.action.setTitle(`Added!\n${trackName}`);
        await ev.action.showOk();
        logger.info(`Added to playlist: ${cur.item.name}`);
      }

      setTimeout(async () => { try { await ev.action.setTitle(""); } catch {} }, 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Error: ${msg}`);
      await ev.action.setTitle("Error");
      await ev.action.showAlert();
      setTimeout(async () => { try { await ev.action.setTitle(""); } catch {} }, 2500);
    }
  }
}

function trunc(s: string, n: number): string {
  return s.length > n ? s.substring(0, n - 1) + "…" : s;
}
