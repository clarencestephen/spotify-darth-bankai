import streamDeck, {
  action,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
  type DidReceiveSettingsEvent,
  type SendToPluginEvent,
} from "@elgato/streamdeck";
import type { JsonObject, JsonValue } from "@elgato/utils";
import { spotifyAuth } from "../spotify-auth";
import {
  getCurrentTrack,
  areItemsSaved,
  isTrackInPlaylist,
  likeAndAddToPlaylist,
  unlikeAndRemoveFromPlaylist,
} from "../spotify-api";
import { handlePlaylistPI } from "./playlist-pi-handler";

const logger = streamDeck.logger.createScope("LikeAndAdd");

type Settings = { playlistId?: string; playlistName?: string };

@action({ UUID: "com.cognosis.spotify-controller.like-and-add" })
export class LikeAndAddAction extends SingletonAction {

  override async onWillAppear(ev: WillAppearEvent): Promise<void> {
    const s = (ev.payload.settings ?? {}) as Settings;
    await ev.action.setTitle(s.playlistName ? trunc(s.playlistName, 10) : "♥+List");
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent): Promise<void> {
    const s = (ev.payload.settings ?? {}) as Settings;
    if (s.playlistName) await ev.action.setTitle(trunc(s.playlistName, 10));
  }

  override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, JsonObject>): Promise<void> {
    await handlePlaylistPI(ev.payload as Record<string, unknown>);
  }

  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    if (!spotifyAuth.isAuthorized) {
      logger.warn("Not authorized");
      await ev.action.setTitle("Auth\nFirst!");
      await ev.action.showAlert();
      return;
    }

    const s = (ev.payload.settings ?? {}) as Settings;
    if (!s.playlistId) {
      logger.error("No playlist selected — open Property Inspector to choose one");
      await ev.action.setTitle("Set\nPlaylist");
      await ev.action.showAlert();
      return;
    }

    const displayName = s.playlistName ? trunc(s.playlistName, 10) : "♥+List";

    try {
      const cur = await getCurrentTrack();
      if (!cur?.item) {
        logger.warn("No track currently playing");
        await ev.action.setTitle("No\nTrack");
        await ev.action.showAlert();
        return;
      }

      // Check current state: is it liked AND in the playlist?
      const [savedArr, inPlaylist] = await Promise.all([
        areItemsSaved([cur.item.uri]),
        isTrackInPlaylist(s.playlistId, cur.item.uri),
      ]);
      const isLiked = savedArr[0];

      if (isLiked && inPlaylist) {
        // UNDO: unlike + remove from playlist
        logger.info(`Undo: ${cur.item.name} — unlike + remove from ${s.playlistName}`);
        const result = await unlikeAndRemoveFromPlaylist(cur.item.uri, s.playlistId);

        if (result.errors.length === 0) {
          await ev.action.setTitle(`Undone!\n${cur.item.name.substring(0, 12)}`);
          await ev.action.showOk();
          logger.info("Both unlike and remove succeeded");
        } else if (result.removedFromPlaylist) {
          await ev.action.setTitle(`Removed\n(unlike err)`);
          await ev.action.showOk();
        } else if (result.unliked) {
          await ev.action.setTitle(`Unliked\n(rm err)`);
          await ev.action.showAlert();
        } else {
          await ev.action.setTitle("Error");
          await ev.action.showAlert();
          logger.error(`Both failed: ${result.errors.join(", ")}`);
        }
      } else {
        // DO: like + add to playlist
        logger.info(`Like + Add: ${cur.item.name} (${cur.item.uri}) to ${s.playlistName} (${s.playlistId})`);
        const result = await likeAndAddToPlaylist(cur.item.uri, s.playlistId);

        if (result.errors.length === 0) {
          await ev.action.setTitle(`Done!\n${cur.item.name.substring(0, 12)}`);
          await ev.action.showOk();
          logger.info("Both like and add succeeded");
        } else if (result.addedToPlaylist) {
          await ev.action.setTitle(`Added!\n(like err)`);
          await ev.action.showOk();
        } else if (result.liked) {
          await ev.action.setTitle(`Liked!\n(add err)`);
          await ev.action.showAlert();
        } else {
          await ev.action.setTitle("Error");
          await ev.action.showAlert();
          logger.error(`Both failed: ${result.errors.join(", ")}`);
        }
      }

      setTimeout(async () => {
        try { await ev.action.setTitle(displayName); } catch {}
      }, 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Error: ${msg}`);
      await ev.action.setTitle("Error");
      await ev.action.showAlert();
      setTimeout(async () => {
        try { await ev.action.setTitle(displayName); } catch {}
      }, 2500);
    }
  }
}

function trunc(s: string, n: number): string {
  return s.length > n ? s.substring(0, n - 1) + "…" : s;
}
