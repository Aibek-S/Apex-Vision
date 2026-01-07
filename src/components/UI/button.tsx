import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import clsx from "clsx";

type ButtonVariant =
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "icon"
    | "destructive"
    | "link";

type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    iconLeft?: React.ReactNode;
    iconRight?: React.ReactNode;
    icon?: React.ReactNode; // icon-only
    loading?: boolean;
    fullWidth?: boolean;
    asChild?: boolean;
    gap?: number | string;
}

const baseStyles =
    "relative inline-flex items-center justify-center rounded-xl font-semibold " +
    "transition-all duration-150 ease-out select-none " +
    "focus-visible:outline-none focus-visible:ring-4 " +
    "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
    primary:
        "bg-primary text-textLight shadow-md " +
        "hover:bg-primaryHover active:scale-95 " +
        "focus-visible:ring-primary/40",

    secondary:
        "bg-secondary text-textLight shadow-md " +
        "hover:bg-secondaryHover active:scale-95 " +
        "focus-visible:ring-secondary/40",

    outline:
        "border-2 border-secondary text-secondary bg-transparent " +
        "hover:bg-secondary/10 active:scale-95 " +
        "focus-visible:ring-secondary/30",

    ghost:
        "bg-transparent text-secondary " +
        "hover:bg-secondary/10 active:scale-95 " +
        "focus-visible:ring-secondary/30",

    icon:
        "bg-background text-secondary " +
        "hover:bg-background/80 active:scale-90 " +
        "focus-visible:ring-secondary/30",

    destructive:
        "bg-destructive text-textLight shadow-md " +
        "hover:bg-destructiveHover active:scale-95 " +
        "focus-visible:ring-destructive/40",

    link:
        "bg-transparent text-primary underline-offset-4 " +
        "hover:underline focus-visible:ring-primary/30",
};

const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-6 text-base",
    lg: "h-14 px-8 text-lg",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = "primary",
            size = "md",
            iconLeft,
            iconRight,
            icon,
            loading = false,
            disabled,
            fullWidth,
            asChild,
            gap = 1.5,
            children,
            ...props
        },
        ref
    ) => {
        const Comp = asChild ? Slot : "button";

        const isDisabled = disabled || loading;

        return (
            <Comp
                ref={ref}
                disabled={!asChild ? isDisabled : undefined}
                className={clsx(
                    baseStyles,
                    variants[variant],
                    `gap-${gap}`,
                    variant !== "icon" && sizes[size],
                    fullWidth && "w-full",
                    variant === "icon" && "h-11 w-11",
                    className
                )}
                {...props}
            >
                {loading && (
                    <span className="absolute h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}

                <span
                    className={clsx(
                        "flex items-center",
                        `gap-${gap}`,
                        loading && "opacity-0"
                    )}
                >
                    {icon && variant === "icon" && icon}
                    {iconLeft && <span>{iconLeft}</span>}
                    {children}
                    {iconRight && <span>{iconRight}</span>}
                </span>
            </Comp>
        );
    }
);

Button.displayName = "Button";
