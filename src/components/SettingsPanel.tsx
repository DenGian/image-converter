import { LockKeyhole, SlidersHorizontal } from 'lucide-react'
import { CAPABILITIES, OUTPUT_FORMATS, type OutputFormat } from '../formats'
import type { ConversionOptions } from '../types'

interface SettingsPanelProps {
  options: ConversionOptions
  onChange: (options: ConversionOptions) => void
  disabled: boolean
}

export function SettingsPanel({ options, onChange, disabled }: SettingsPanelProps) {
  const format = CAPABILITIES[options.format]
  const update = (patch: Partial<ConversionOptions>) => onChange({ ...options, ...patch })
  const updateResize = (patch: Partial<ConversionOptions['resize']>) =>
    update({ resize: { ...options.resize, ...patch } })
  return (
    <aside className="settings-panel" aria-label="Conversion settings">
      <div className="panel-title">
        <SlidersHorizontal size={18} />
        <h2>Output settings</h2>
      </div>
      <label className="field">
        <span>Convert to</span>
        <select
          aria-label="Output format"
          value={options.format}
          disabled={disabled}
          onChange={(event) => update({ format: event.target.value as OutputFormat })}
        >
          {OUTPUT_FORMATS.map((output) => (
            <option key={output} value={output}>
              {CAPABILITIES[output].label}
            </option>
          ))}
        </select>
      </label>
      {format.lossy && (
        <label className="field range-field">
          <span>
            Quality <output>{options.quality}</output>
          </span>
          <input
            aria-label="Image quality"
            type="range"
            min="35"
            max="100"
            value={options.quality}
            disabled={disabled}
            onChange={(event) => update({ quality: Number(event.target.value) })}
          />
        </label>
      )}
      {!format.alpha && (
        <label className="field color-field">
          <span>Transparency fill</span>
          <span className="color-control">
            <input
              aria-label="Transparency background colour"
              type="color"
              value={options.background}
              disabled={disabled}
              onChange={(event) => update({ background: event.target.value })}
            />
            <code>{options.background.toUpperCase()}</code>
          </span>
        </label>
      )}
      <fieldset className="resize-fields" disabled={disabled}>
        <legend>
          Resize <span>optional</span>
        </legend>
        <div className="dimension-row">
          <label>
            <span>Width</span>
            <input
              aria-label="Resize width"
              type="number"
              min="1"
              placeholder="Auto"
              value={options.resize.width ?? ''}
              onChange={(event) =>
                updateResize({ width: event.target.value ? Number(event.target.value) : null })
              }
            />
          </label>
          <span aria-hidden="true">×</span>
          <label>
            <span>Height</span>
            <input
              aria-label="Resize height"
              type="number"
              min="1"
              placeholder="Auto"
              value={options.resize.height ?? ''}
              onChange={(event) =>
                updateResize({ height: event.target.value ? Number(event.target.value) : null })
              }
            />
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={options.resize.preserveAspectRatio}
            onChange={(event) => updateResize({ preserveAspectRatio: event.target.checked })}
          />{' '}
          Preserve aspect ratio
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={options.resize.neverUpscale}
            onChange={(event) => updateResize({ neverUpscale: event.target.checked })}
          />{' '}
          Never upscale
        </label>
        {options.resize.width && options.resize.height && options.resize.preserveAspectRatio && (
          <label className="field compact">
            <span>Fit</span>
            <select
              aria-label="Resize fit"
              value={options.resize.fit}
              onChange={(event) => updateResize({ fit: event.target.value as 'contain' | 'cover' })}
            >
              <option value="contain">Contain</option>
              <option value="cover">Cover & crop</option>
            </select>
          </label>
        )}
      </fieldset>
      <label className="check privacy-check">
        <input
          type="checkbox"
          checked={options.stripMetadata}
          disabled={disabled}
          onChange={(event) => update({ stripMetadata: event.target.checked })}
        />
        <span>
          <strong>
            <LockKeyhole size={14} /> Strip metadata
          </strong>
          <small>Removes EXIF and other private details</small>
        </span>
      </label>
    </aside>
  )
}
