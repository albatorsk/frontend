import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import {
  array,
  assert,
  boolean,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-card";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-switch";
import type { HomeAssistant } from "../../../../types";
import type { EntitiesCardConfig } from "../../cards/types";
import "../../components/hui-theme-select-editor";
import type { LovelaceRowConfig } from "../../entity-rows/types";
import { headerFooterConfigStructs } from "../../header-footer/types";
import type { LovelaceCardEditor } from "../../types";
import "../header-footer-editor/hui-header-footer-editor";
import "../hui-config-element-template";
import "../hui-entities-card-row-editor";
import "../hui-sub-element-editor";
import { processEditorEntities } from "../process-editor-entities";
import {
  EditorTarget,
  EditSubElementEvent,
  entitiesConfigStruct,
  SubElementEditorConfig,
} from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = object({
  type: string(),
  title: optional(union([string(), boolean()])),
  theme: optional(string()),
  show_header_toggle: optional(boolean()),
  state_color: optional(boolean()),
  entities: array(entitiesConfigStruct),
  header: optional(headerFooterConfigStructs),
  footer: optional(headerFooterConfigStructs),
});

@customElement("hui-entities-card-editor")
export class HuiEntitiesCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public isAdvanced?: boolean;

  @internalProperty() private _config?: EntitiesCardConfig;

  @internalProperty() private _configEntities?: LovelaceRowConfig[];

  @internalProperty() private _subElementEditorConfig?: SubElementEditorConfig;

  public setConfig(config: EntitiesCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _theme(): string {
    return this._config!.theme || "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    if (this._subElementEditorConfig) {
      return html`
        <hui-sub-element-editor
          .hass=${this.hass}
          .config=${this._subElementEditorConfig}
          .isAdvancedUser=${this.isAdvanced}
          @go-back=${this._goBack}
          @config-changed=${this._handleSubElementChanged}
        >
        </hui-sub-element-editor>
      `;
    }

    return html`
      <hui-config-element-template
        .hass=${this.hass}
        .isAdvanced=${this.isAdvanced}
      >
        <div class="card-config">
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.title"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._title}
            .configValue=${"title"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <ha-settings-row>
            <span slot="heading">
              ${this.hass.localize(
                "ui.panel.lovelace.editor.card.entities.show_header_toggle"
              )}
            </span>
            <span slot="description">
              ${this.hass.localize(
                "ui.panel.lovelace.editor.card.entities.show_header_toggle_secondary"
              )}
            </span>
            <ha-switch
              .checked=${this._config!.show_header_toggle !== false}
              .configValue=${"show_header_toggle"}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-settings-row>
        </div>
        <hui-entities-card-row-editor
          .hass=${this.hass}
          .entities=${this._configEntities}
          @entities-changed=${this._valueChanged}
          @edit-detail-element=${this._editDetailElement}
        ></hui-entities-card-row-editor>
        <div slot="advanced" class="card-config">
          <hui-header-footer-editor
            .hass=${this.hass}
            .configValue=${"header"}
            .config=${this._config.header}
            @value-changed=${this._valueChanged}
            @edit-detail-element=${this._editDetailElement}
          ></hui-header-footer-editor>
          <hui-header-footer-editor
            .hass=${this.hass}
            .configValue=${"footer"}
            .config=${this._config.footer}
            @value-changed=${this._valueChanged}
            @edit-detail-element=${this._editDetailElement}
          ></hui-header-footer-editor>
          <ha-settings-row three-line>
            <span slot="heading">
              ${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.state_color"
              )}
            </span>
            <ha-switch
              .checked=${this._config!.state_color}
              .configValue=${"state_color"}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-settings-row>
          <hui-theme-select-editor
            .hass=${this.hass}
            .value=${this._theme}
            .configValue=${"theme"}
            @value-changed=${this._valueChanged}
          ></hui-theme-select-editor>
        </div>
      </hui-config-element-template>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target! as EditorTarget;
    const configValue =
      target.configValue || this._subElementEditorConfig?.type;
    const value =
      target.checked !== undefined
        ? target.checked
        : target.value || ev.detail.config || ev.detail.value;

    if (
      (configValue! === "title" && target.value === this._title) ||
      (configValue! === "theme" && target.value === this._theme)
    ) {
      return;
    }

    if (ev.detail && ev.detail.entities) {
      const newConfigEntities =
        ev.detail.entities || this._configEntities!.concat();
      this._config = { ...this._config!, entities: newConfigEntities };
      this._configEntities = processEditorEntities(this._config!.entities);
    } else if (configValue) {
      if (value === "") {
        this._config = { ...this._config };
        delete this._config[configValue!];
      } else {
        this._config = {
          ...this._config,
          [configValue]: value,
        };
      }
    }

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleSubElementChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const configValue = this._subElementEditorConfig?.type;

    if (!this._config || !this.hass || !configValue) {
      return;
    }

    const value = ev.detail.config;
    let goBack = false;

    if (configValue === "row") {
      const newConfigEntities = this._configEntities!.concat();
      if (!value) {
        newConfigEntities.splice(this._subElementEditorConfig!.index!, 1);
        goBack = true;
      } else {
        newConfigEntities[this._subElementEditorConfig!.index!] = value;
      }

      this._config = { ...this._config!, entities: newConfigEntities };
      this._configEntities = processEditorEntities(this._config!.entities);
    } else if (configValue) {
      if (!value || value === "") {
        this._config = { ...this._config };
        delete this._config[configValue!];
        goBack = true;
      } else {
        this._config = {
          ...this._config,
          [configValue]: value,
        };
      }
    }

    if (goBack) {
      this._goBack();
    } else {
      this._subElementEditorConfig = {
        ...this._subElementEditorConfig!,
        elementConfig: value,
      };
    }

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _editDetailElement(ev: HASSDomEvent<EditSubElementEvent>): void {
    this._subElementEditorConfig = ev.detail.subElementConfig;
  }

  private _goBack(): void {
    this._subElementEditorConfig = undefined;
  }

  static get styles(): CSSResultArray {
    return [
      configElementStyle,
      css`
        .edit-entity-row-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 18px;
        }

        hui-header-footer-editor {
          padding-top: 4px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-card-editor": HuiEntitiesCardEditor;
  }
}
