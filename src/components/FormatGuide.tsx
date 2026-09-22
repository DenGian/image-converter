import { CAPABILITIES, INPUT_FORMATS, OUTPUT_FORMATS } from '../formats'

export function FormatGuide() {
  return (
    <details className="format-guide">
      <summary>Verified format support</summary>
      <div className="format-grid">
        <div>
          <strong>Read</strong>
          <p>{INPUT_FORMATS.map((format) => CAPABILITIES[format].label).join(' · ')}</p>
        </div>
        <div>
          <strong>Write</strong>
          <p>{OUTPUT_FORMATS.map((format) => CAPABILITIES[format].label).join(' · ')}</p>
        </div>
      </div>
      <p className="fine-print">
        HEIC/HEIF is input-only. ICO is output-only. Multi-frame{' '}
        {INPUT_FORMATS.filter((format) => CAPABILITIES[format].framePolicy === 'first')
          .map((format) => CAPABILITIES[format].label)
          .join(', ')}{' '}
        input uses the first frame or page and shows a warning.
      </p>
    </details>
  )
}
