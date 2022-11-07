import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/tile/ha-tile-button";
import "../../../components/tile/ha-tile-slider";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceTileControl } from "../types";
import { LightBrightnessTileControlConfig } from "./types";

@customElement("hui-light-brightness-tile-control")
class HuiLightBrightnessTileControl
  extends LitElement
  implements LovelaceTileControl
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: LightBrightnessTileControlConfig;

  static getStubConfig(): LightBrightnessTileControlConfig {
    return {
      type: "light-brightness",
    };
  }

  public setConfig(config: LightBrightnessTileControlConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass || !this.stateObj) {
      return html``;
    }

    const position =
      this.stateObj.attributes.brightness != null
        ? Math.max(
            Math.round((this.stateObj.attributes.brightness * 100) / 255),
            1
          )
        : undefined;

    return html`
      <div class="container">
        <ha-tile-slider
          .value=${position}
          .disabled=${this.stateObj!.state === UNAVAILABLE}
          @value-changed=${this._valueChanged}
          .label=${this.hass.localize("ui.card.cover.position")}
        ></ha-tile-slider>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;

    this.hass!.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      brightness_pct: value,
    });
  }

  static get styles() {
    return css`
      ha-tile-slider {
        --tile-slider-bar-color: rgb(var(--tile-color));
        --tile-slider-bar-background: rgba(var(--tile-color), 0.2);
      }
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-brightness-tile-control": HuiLightBrightnessTileControl;
  }
}
