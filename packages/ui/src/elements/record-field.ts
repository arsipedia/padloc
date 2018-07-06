import { LitElement, html } from "@polymer/lit-element";
import { isTouch } from "@padlock/core/lib/platform.js";
import { Record, Field } from "@padlock/core/lib/data.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import sharedStyles from "../styles/shared.js";
import { lineUpDialog, generate } from "../dialog.js";
import { setClipboard } from "../clipboard.js";
import "./icon.js";
import "./input.js";
import "./dialog-field.js";

class RecordField extends LitElement {
    static get properties() {
        return {
            record: Object,
            field: Object
        };
    }

    _render(props: { record: Record; field: Field }) {
        return html`
        <style>
            ${sharedStyles}

            :host {
                display: block;
                color: inherit;
                font-size: var(--font-size-small);
                overflow: hidden;
                position: relative;
            }

            .container {
                display: flex;
                height: 100px;
                position: relative;
                flex-direction: column;
                padding-right: 50px;
            }

            .name {
                font-size: var(--font-size-tiny);
                font-weight: bold;
                color: var(--color-highlight);
                margin: 12px 12px 6px 12px;
            }

            #valueInput {
                font-family: var(--font-family-mono);
                font-size: 130%;
                line-height: 1.2;
                flex: 1;
                margin: 0 12px;
                opacity: 1;
            }

            #valueInput::after {
                content: "";
                display: block;
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                height: 20px;
                background: linear-gradient(rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%);
            }

            .field-buttons {
                position: absolute;
                top: 0;
                right: 0;
                z-index: 1;
            }

            .field-button {
                display: block;
                cursor: pointer;
                font-size: 110%;
                width: 50px;
                height: 50px;
            }

            :host(:not(.touch):not(:hover)) .field-buttons {
                visibility: hidden;
            }

            .field-button:hover {
                background: rgba(0, 0, 0, 0.05);
            }
        </style>

        <div class="container tap" on-click="${() => this._openFieldDialog()}">

            <div class="name">${props.field.name}</div>

            <pl-input
                multiline
                id="valueInput"
                value="${props.field.value}"
                disabled
                placeholder="${$l("No Content")}"
                masked="${props.field.masked}">
            </pl-input>

        </div>

        <div class="field-buttons">

            <pl-icon
                icon="${props.field.masked ? "show" : "hide"}"
                class="field-button tap"
                on-click="${() => this._toggleMask()}"
                hidden?="${!props.field.value}">
            </pl-icon>

            <pl-icon
                icon="copy"
                class="field-button tap"
                on-click="${() => this._copy()}"
                hidden?="${!props.field.value}">
            </pl-icon>

            <pl-icon
                icon="edit"
                class="field-button tap"
                on-click="${() => this._edit()}"
                hidden?="${!!props.field.value}">
            </pl-icon>

            <pl-icon
                icon="generate"
                class="field-button tap"
                on-click="${() => this._showGenerator()}"
                hidden?="${!!props.field.value}">
            </pl-icon>

        </div>
`;
    }

    connectedCallback() {
        super.connectedCallback();
        this.classList.toggle("touch", isTouch());
    }

    _delete() {
        this.dispatchEvent(new CustomEvent("field-delete", { bubbles: true, composed: true }));
    }

    async _showGenerator() {
        const value = await generate();
        this.field.value = value;
        this.requestRender();
        this.dispatchEvent(new CustomEvent("field-change"));
    }

    _copy() {
        return setClipboard(this.record, this.field);
    }

    _toggleMask() {
        this.set("field.masked", !this.field.masked);
        this.dispatchEvent(new CustomEvent("field-change"));
    }

    async _openFieldDialog(edit = false, presets?: any) {
        const result = await lineUpDialog("pl-dialog-field", d => d.openField(this.field, edit, presets));
        switch (result.action) {
            case "copy":
                this._copy();
                break;
            case "generate":
                const value = await generate();
                this._openFieldDialog(true, { name: result.name, value: value || result.value });
                break;
            case "delete":
                this._delete();
                break;
            case "edited":
                this.requestRender();
                setTimeout(() => this.dispatchEvent(new CustomEvent("field-change"), 500));
                break;
        }
    }

    _edit() {
        this._openFieldDialog(true);
    }
}

window.customElements.define("pl-record-field", RecordField);
