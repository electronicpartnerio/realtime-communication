import {css} from "lit";

export const playgroundStyle = css`
    :host {
        display: block;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
    }

    .grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(12, minmax(0, 1fr));
    }

    .row {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: subgrid;
        gap: 12px;
        align-items: center;
    }

    label {
        font-size: 12px;
        color: #555;
    }

    input[type="text"], input[type="number"], select, textarea {
        padding: 8px;
        border: 1px solid #d0d5dd;
        border-radius: 8px;
        font: inherit;
        width: 100%;
        box-sizing: border-box;
    }

    textarea {
        min-height: 90px;
    }

    fieldset {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 12px;
    }

    legend {
        font-weight: 600;
        padding: 0 6px;
    }

    .btn {
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid #d0d5dd;
        background: #fff;
        cursor: pointer;
    }

    .btn.primary {
        background: #111827;
        color: #fff;
        border-color: #111827;
    }

    .btn.red {
        background: #b91c1c;
        color: #fff;
        border-color: #b91c1c;
    }

    .btn:disabled {
        opacity: .6;
        cursor: not-allowed;
    }

    .muted {
        color: #6b7280;
        font-size: 12px;
    }

    .col-3 {
        grid-column: span 3;
    }

    .col-4 {
        grid-column: span 4;
    }

    .col-6 {
        grid-column: span 6;
    }

    .col-8 {
        grid-column: span 8;
    }

    .col-12 {
        grid-column: 1/-1;
    }

    .card {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px;
        background: #fff;
    }

    .stack {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }
`