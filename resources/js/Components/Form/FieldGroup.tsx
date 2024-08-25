interface FieldGroupProps {
  name?: string;
  label?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export default function FieldGroup({
  label,
  name,
  error,
  required,
  children
}: FieldGroupProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-white select-none" htmlFor={name}>
          {label} {required && <span style={{ color: 'red' }}>*</span>}
        </label>
      )}
      {children}
      {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
    </div>
  );
}
