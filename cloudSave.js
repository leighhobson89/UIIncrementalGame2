import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { setSaveName, getSaveName, captureGameStatusForSaving, restoreGameStatus, getLanguage } from './constantsAndGlobalVars.js';
import { showNotification } from './ui.js';
import { localize } from './localization.js';

const supabaseUrl = 'https://riogcxvtomyjlzkcnujf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb2djeHZ0b215amx6a2NudWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMjY1NDgsImV4cCI6MjA1OTYwMjU0OH0.HH7KXPrcORvl6Wiefupl422gRYxAa_kFCRM2-puUcsQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize cloud save UI
export function initCloudSaveUI() {
    // Add cloud save/load buttons to the UI
    const menuContent = document.querySelector('.menu-content');
    const existingBtn = document.getElementById('cloudSaveBtn');
    if (menuContent && !existingBtn) {
        const cloudSaveBtn = document.createElement('button');
        cloudSaveBtn.id = 'cloudSaveBtn';
        cloudSaveBtn.className = 'btn btn-primary menu-btn mb-2';
        cloudSaveBtn.textContent = localize('cloudSaveLoad', getLanguage()) || 'Cloud Save / Load';
        cloudSaveBtn.addEventListener('click', showCloudSaveModal);
        menuContent.insertBefore(cloudSaveBtn, document.getElementById('loadGame').nextSibling);
    } else if (existingBtn && !existingBtn.dataset.cloudInit) {
        existingBtn.addEventListener('click', showCloudSaveModal);
        existingBtn.dataset.cloudInit = '1';
    }
}

// Show cloud save/load modal
function showCloudSaveModal() {
    // Create or show existing modal
    let modal = document.getElementById('cloudSaveModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cloudSaveModal';
        modal.className = 'modal fade';
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
                            <p class="mb-0">Cloud saves use the name you set when starting a new game.</p>
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
        modal.querySelector('#saveToCloudBtn').addEventListener('click', saveToCloud);
        modal.querySelector('#loadFromCloudBtn').addEventListener('click', loadFromCloud);
        // No manual name entry in this modal anymore
    }
    
    // Show the modal
    $(modal).modal('show');
    // Nothing to prefill; using stored save name
}

// Save game to cloud
async function saveToCloud() {
    const saveName = (typeof getSaveName === 'function' ? getSaveName() : '') || '';
    if (!saveName) {
        showNotification('Please start a New Game and set a save name first', 'error');
        return;
    }

    try {
        // Get game state
        const gameState = captureGameStatusForSaving();
        const serializedGameState = JSON.stringify(gameState);
        const compressedSaveData = LZString.compressToEncodedURIComponent(serializedGameState);
        
        // Check if save already exists
        const { data: existingSave, error: fetchError } = await supabase
            .from('WealthInc_Saves')
            .select('save_name')
            .eq('save_name', saveName)
            .single();

        let result;
        if (existingSave) {
            // Update existing save
            const { error } = await supabase
                .from('WealthInc_Saves')
                .update({ 
                    data: compressedSaveData,
                    updated_at: new Date().toISOString()
                })
                .eq('save_name', saveName);
            
            if (error) throw error;
            showNotification('Game saved to cloud!', 'success');
        } else {
            // Create new save
            const { error } = await supabase
                .from('WealthInc_Saves')
                .insert([{ 
                    save_name: saveName, 
                    data: compressedSaveData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);
            
            if (error) throw error;
            showNotification('New save created in cloud!', 'success');
        }

        // Update the saves list
        //loadCloudSaves();
        setSaveName(saveName);
        
    } catch (error) {
        console.error('Error saving to cloud:', error);
        showNotification('Error saving to cloud', 'error');
    }
}

// Load game from cloud
async function loadFromCloud() {
    const saveName = (typeof getSaveName === 'function' ? getSaveName() : '') || '';
    if (!saveName) {
        showNotification('Please start a New Game and set a save name first', 'error');
        return;
    }

    try {
        const { data: save, error } = await supabase
            .from('WealthInc_Saves')
            .select('data')
            .eq('save_name', saveName)
            .single();

        if (error) throw error;
        if (!save?.data) throw new Error('No save data found');

        // Decompress and parse the save data
        const decompressed = LZString.decompressFromEncodedURIComponent(save.data);
        if (!decompressed) throw new Error('Invalid save data');

        const gameState = JSON.parse(decompressed);
        
        // Restore the game state
        await restoreGameStatus(gameState);
        setSaveName(saveName);
        
        // Enable the Resume Game and Save Game buttons
        const resumeBtn = document.getElementById('resumeFromMenu');
        const saveBtn = document.getElementById('saveGame');
        
        if (resumeBtn) {
            resumeBtn.classList.remove('disabled');
            resumeBtn.classList.add('btn-primary');
        }
        
        if (saveBtn) {
            saveBtn.classList.remove('disabled');
            saveBtn.classList.add('btn-primary');
        }
        
        // Close the modal
        $('#cloudSaveModal').modal('hide');
        showNotification('Game loaded from cloud!', 'success');
        
    } catch (error) {
        console.error('Error loading from cloud:', error);
        showNotification('Error loading from cloud', 'error');
    }
}

// Initialize cloud save functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initCloudSaveUI();
});