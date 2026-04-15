/// <reference types="vite/client" />

declare namespace JSX {
    interface IntrinsicElements {
        "model-viewer": React.DetailedHTMLProps<
            React.HTMLAttributes<HTMLElement>,
            HTMLElement
        > & {
            src?: string;
            alt?: string;
            "camera-controls"?: boolean;
            autoplay?: boolean;
            ar?: boolean;
        };
    }
}
