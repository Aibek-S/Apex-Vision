/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Nunito"', "ui-sans-serif", "system-ui"],
                heading: ['"Quicksand"', "ui-sans-serif", "system-ui"],
                logo: ['"Rubik Mono One"', "ui-sans-serif", "system-ui"],
            },
            colors: {
                primary: "#ff3c38",
                primaryHover: "#e63632",
                primaryLight: "#ff6b68",
                primaryDark: "#cc302d",

                secondary: "#a23e48",
                secondaryHover: "#8f3640",
                secondaryLight: "#c45660",
                secondaryDark: "#7a2f37",

                background: "#ffd5b5",
                backgroundLight: "#fff5eb",
                backgroundDark: "#ffc895",

                destructive: "#b91c1c",
                destructiveHover: "#991b1b",

                textDark: "#1f1f1f",
                textLight: "#ffffff",
                textMuted: "#6b7280",
            },
            borderRadius: {
                xl: "1rem",
            },
            animation: {
                "fade-in": "fade-in 0.8s ease-out",
            },
            keyframes: {
                burgerBounce: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-2px)" },
                },
                "fade-in": {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [],
};
