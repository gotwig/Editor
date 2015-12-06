﻿module BABYLON.EDITOR {
    export class ToolsToolbar implements ICustomUpdate, IEventReceiver {
        // Public members
        public container: string = "BABYLON-EDITOR-TOOLS-TOOLBAR";
        public toolbar: GUI.GUIToolbar = null;
        public panel: GUI.IGUIPanel = null;

        // Private members
        private _core: EditorCore;
        private _editor: EditorMain;

        private _playGameID: string = "PLAY-GAME";

        private _transformerPositionID: string = "TRANSFORMER-POSITION";
        private _transformerRotationID: string = "TRANSFORMER-ROTATION";
        private _transformerScalingID: string = "TRANSFORMER-SCALING";

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this._editor = core.editor;
            this._core = core;

            this.panel = this._editor.layouts.getPanelFromType("top");

            // Register this
            this._core.updates.push(this);
            this._core.eventReceivers.push(this);
        }

        // Pre update
        public onPreUpdate(): void {

        }
        
        // Post update
        public onPostUpdate(): void {

        }

        // Event
        public onEvent(event: Event): boolean {
            if (event.eventType === EventType.GUI_EVENT && event.guiEvent.eventType === GUIEventType.TOOLBAR_MENU_SELECTED) {
                if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                    return false;
                }

                var id: string = event.guiEvent.data;
                var finalID = id.split(":");
                var item = this.toolbar.getItemByID(finalID[finalID.length - 1]);

                if (item === null)
                    return false;

                if (id.indexOf(this._transformerPositionID) !== -1) {
                    this._editor.transformer.transformerType = TransformerType.POSITION;
                }
                else if (id.indexOf(this._transformerRotationID) !== -1) {
                    this._editor.transformer.transformerType = TransformerType.ROTATION;
                }
                else if (id.indexOf(this._transformerScalingID) !== -1) {
                    this._editor.transformer.transformerType = TransformerType.SCALING;
                }
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            if (this.toolbar != null)
                this.toolbar.destroy();

            this.toolbar = new GUI.GUIToolbar(this.container, this._core);

            // Play game
            this.toolbar.createMenu("button", this._playGameID, "Play...", "icon-play-game");
            this.toolbar.addBreak();

            this.toolbar.createMenu("button", this._transformerPositionID, "", "icon-position");
            this.toolbar.createMenu("button", this._transformerRotationID, "", "icon-rotation");
            this.toolbar.createMenu("button", this._transformerScalingID, "", "icon-scaling");

            // Build element
            this.toolbar.buildElement(this.container);
        }
    }
}