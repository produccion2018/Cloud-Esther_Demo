type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
};

/* Switch chiquito tipo palanca — verde cuando está activo, gris cuando no */
export function ToggleSwitch({ checked, onChange, disabled, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
        disabled
          ? "cursor-not-allowed bg-muted opacity-60"
          : checked
            ? "bg-emerald-500"
            : "bg-muted-foreground/25"
      }`}
    >
      <span
        className={`inline-block size-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}