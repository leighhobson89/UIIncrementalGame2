import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";
import {
  setSaveName,
  getSaveName,
  captureGameStatusForSaving,
  restoreGameStatus,
  getLanguage,
} from "./constantsAndGlobalVars.js";
import { showNotification } from "./ui.js";
import { localize } from "./localization.js";

// Function to check if a player name already exists in the database
export async function checkPlayerNameExists(name) {
  if (!name) return false;

  try {
    const { data, error } = await supabase
      .from("WealthInc_Saves")
      .select("save_name")
      .eq("save_name", name)
      .maybeSingle();

    if (error) throw error;
    return !!data; // Returns true if name exists, false otherwise
  } catch (error) {
    console.error("Error checking player name:", error);
    return false; // On error, assume name is available to avoid blocking the user
  }
}

const supabaseUrl = "https://riogcxvtomyjlzkcnujf.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb2djeHZ0b215amx6a2NudWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMjY1NDgsImV4cCI6MjA1OTYwMjU0OH0.HH7KXPrcORvl6Wiefupl422gRYxAa_kFCRM2-puUcsQ";
const supabase = createClient(supabaseUrl, supabaseKey);

// Autosave state
let autosaveTimeoutId = null;
const AUTOSAVE_INTERVAL_MS = 120000; // 120 seconds

function scheduleAutosave() {
  if (autosaveTimeoutId) {
    clearTimeout(autosaveTimeoutId);
    autosaveTimeoutId = null;
  }
  autosaveTimeoutId = setTimeout(async () => {
    try {
      const name = (() => {
        try {
          return localStorage.getItem("currentSaveNameWealthInc") || "";
        } catch {
          return "";
        }
      })();
      console.debug(`[Cloud Save] Starting autosave for user: ${name}`);
      if (name) {
        await saveToCloud();
      }
    } catch (e) {
      // Ignore autosave errors; try again next cycle
      console.error("Autosave error:", e);
    } finally {
      scheduleAutosave();
    }
  }, AUTOSAVE_INTERVAL_MS);
}

function resetAutosaveTimer() {
  scheduleAutosave();
}

// Initialize cloud save UI
export function initCloudSaveUI() {
  // Add cloud save/load buttons to the UI
  const menuContent = document.querySelector(".menu-content");
  const existingBtn = document.getElementById("cloudSaveBtn");
  if (menuContent && !existingBtn) {
    const cloudSaveBtn = document.createElement("button");
    cloudSaveBtn.id = "cloudSaveBtn";
    cloudSaveBtn.className = "btn btn-primary menu-btn mb-2";
    cloudSaveBtn.textContent =
      localize("cloudSaveLoad", getLanguage()) || "Cloud Save / Load";
    cloudSaveBtn.addEventListener("click", showCloudSaveModal);
    menuContent.insertBefore(
      cloudSaveBtn,
      document.getElementById("loadGame").nextSibling
    );
  } else if (existingBtn && !existingBtn.dataset.cloudInit) {
    existingBtn.addEventListener("click", showCloudSaveModal);
    existingBtn.dataset.cloudInit = "1";
  }
}

// Show cloud save/load modal
function showCloudSaveModal() {
  // Create or show existing modal
  let modal = document.getElementById("cloudSaveModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "cloudSaveModal";
    modal.className = "modal fade";
    modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" data-i18n="cloudSaveLoad">Cloud Save / Load</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div id="saveNameContainer" class="form-group">
                            <p class="mb-0" data-i18n="saveNameDescription">Cloud saves use the name you set when starting a new game.</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="loadFromCloudBtn" class="btn btn-primary" data-i18n="loadFromCloud">Load from Cloud</button>
                        <button id="saveToCloudBtn" class="btn btn-success" data-i18n="saveToCloud">Save to Cloud</button>
                        <button type="button" class="btn btn-secondary" data-dismiss="modal" data-i18n="close">Close</button>
                    </div>
                </div>
            </div>
        `;
    document.body.appendChild(modal);

    // Add event listeners
    modal
      .querySelector("#saveToCloudBtn")
      .addEventListener("click", () => saveToCloud(false));
    modal
      .querySelector("#loadFromCloudBtn")
      .addEventListener("click", loadFromCloud);
    // No manual name entry in this modal anymore
  }

  // Show the modal
  $(modal).modal("show");
  // Nothing to prefill; using stored save name
}

// Save game to cloud
/**
 * Saves the game state to the cloud
 * @param {boolean} [initialSave=false] - Should only be true when a new game is started through the new game modal
 */
async function saveToCloud(initialSave = false) {
  const saveName =
    (typeof getSaveName === "function" ? getSaveName() : "") || "";
  if (!saveName) {
    console.debug("[Cloud Save] No save name found, skipping cloud save");
    return;
  }
  const currentCoins = window.getCoins ? window.getCoins() : "N/A";
  console.debug(
    `[Cloud Save] Starting ${
      initialSave ? "initial " : ""
    }save for user: ${saveName}, current coins: ${currentCoins}`
  );

  try {
    // For initial save (new game), use a minimal game state
    // For all other saves (auto/manual), capture the full game state
    const gameState = initialSave
      ? { version: 2, initialSave: true, timestamp: new Date().toISOString() }
      : captureGameStatusForSaving();

    const serializedGameState = JSON.stringify(gameState);
    const compressedSaveData =
      LZString.compressToEncodedURIComponent(serializedGameState);

    // For initial save, check if save exists first
    if (initialSave) {
      const { data: existingSave, error: fetchError } = await supabase
        .from("WealthInc_Saves")
        .select("save_name")
        .eq("save_name", saveName)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingSave) {
        // Update existing save
        const { error } = await supabase
          .from("WealthInc_Saves")
          .update({
            data: compressedSaveData,
            updated_at: new Date().toISOString(),
          })
          .eq("save_name", saveName);

        if (error) throw error;
        const updatedCoins = window.getCoins ? window.getCoins() : "N/A";
        console.debug(
          `[Cloud Save] Initial cloud save updated for user: ${saveName}, coins before: ${currentCoins}, coins after: ${updatedCoins}`
        );
      } else {
        // Create new save
        const { error } = await supabase.from("WealthInc_Saves").insert([
          {
            save_name: saveName,
            data: compressedSaveData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;
        const updatedCoins = window.getCoins ? window.getCoins() : "N/A";
        console.debug(
          `[Cloud Save] New initial cloud save created for user: ${saveName}, coins before: ${currentCoins}, coins after: ${updatedCoins}`
        );
      }
      return;
    }

    // Normal save flow
    const { data: existingSave, error: fetchError } = await supabase
      .from("WealthInc_Saves")
      .select("save_name")
      .eq("save_name", saveName)
      .single();

    if (existingSave) {
      const { error } = await supabase
        .from("WealthInc_Saves")
        .update({
          data: compressedSaveData,
          updated_at: new Date().toISOString(),
        })
        .eq("save_name", saveName);

      if (error) throw error;
      const updatedCoins = window.getCoins ? window.getCoins() : "N/A";
      console.debug(
        `[Cloud Save] Cloud save updated for user: ${saveName}, coins before: ${currentCoins}, coins after: ${updatedCoins}`
      );
      showNotification(
        localize("notfcn_cloudSaveSuccess", getLanguage()) ||
          "Game saved to cloud!",
        "success"
      );
    } else {
      const { error } = await supabase.from("WealthInc_Saves").insert([
        {
          save_name: saveName,
          data: compressedSaveData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
      const updatedCoins = window.getCoins ? window.getCoins() : "N/A";
      console.debug(
        `[Cloud Save] New cloud save created for user: ${saveName}, coins before: ${currentCoins}, coins after: ${updatedCoins}`
      );
      showNotification(
        localize("notfcn_cloudSaveCreated", getLanguage()) ||
          "New save created in cloud!",
        "success"
      );
    }

    // Reset autosave timer on successful save
    if (typeof resetAutosaveTimer === "function") {
      resetAutosaveTimer();
    }
  } catch (error) {
    console.error(
      `[Cloud Save] Error in saveToCloud for user ${saveName}:`,
      error
    );
    // Don't show error notifications for autosaves to avoid being annoying
    if (!initialSave) {
      showNotification(
        localize("notfcn_cloudSaveError", getLanguage()) ||
          "Error saving to cloud",
        "error"
      );
    }
  }
}

// Load game from cloud
export async function loadFromCloud() {
  const saveName =
    (typeof getSaveName === "function" ? getSaveName() : "") || "";
  const coinsBeforeLoad = window.getCoins ? window.getCoins() : "N/A";
  console.debug(
    `[Cloud Load] Attempting to load game for user: ${
      saveName || "No save name found"
    }, coins before load: ${coinsBeforeLoad}`
  );
  if (!saveName) {
    showNotification(
      localize("notfcn_saveNameRequired", getLanguage()) ||
        "Please start a New Game and set a save name first",
      "error"
    );
    return;
  }

  try {
    const { data: save, error } = await supabase
      .from("WealthInc_Saves")
      .select("data")
      .eq("save_name", saveName)
      .single();

    if (error) throw error;
    if (!save?.data) throw new Error("No save data found");

    // Decompress and parse the save data
    const decompressed = LZString.decompressFromEncodedURIComponent(save.data);
    if (!decompressed) throw new Error("Invalid save data");

    const gameState = JSON.parse(decompressed);

    // Restore the game state
    console.debug(
      `[Cloud Load] Successfully retrieved save data for user: ${saveName}`
    );
    await restoreGameStatus(gameState);
    setSaveName(saveName);
    const coinsAfterLoad = window.getCoins ? window.getCoins() : "N/A";
    console.debug(
      `[Cloud Load] Game state restored for user: ${saveName}, coins before: ${coinsBeforeLoad}, coins after: ${coinsAfterLoad}`
    );

    // Enable the Resume Game and Save Game buttons
    const resumeBtn = document.getElementById("resumeFromMenu");
    const saveBtn = document.getElementById("saveGame");

    if (resumeBtn) {
      resumeBtn.classList.remove("disabled");
      resumeBtn.classList.add("btn-primary");
    }

    if (saveBtn) {
      saveBtn.classList.remove("disabled");
      saveBtn.classList.add("btn-primary");
    }

    // Close the modal
    $("#cloudSaveModal").modal("hide");
    showNotification(
      localize("notfcn_cloudLoadSuccess", getLanguage()) ||
        "Game loaded from cloud!",
      "success"
    );
  } catch (error) {
    console.error(
      `[Cloud Load] Error loading from cloud for user ${saveName}:`,
      error
    );
    showNotification(
      localize("notfcn_cloudLoadError", getLanguage()) ||
        "Error loading from cloud",
      "error"
    );
  }
}

// Initialize cloud save functionality when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initCloudSaveUI();
  scheduleAutosave();
});

// Expose saveToCloud so other modules can trigger it without importing (avoid circular deps)
try {
  window.saveToCloud = saveToCloud;
} catch {}
