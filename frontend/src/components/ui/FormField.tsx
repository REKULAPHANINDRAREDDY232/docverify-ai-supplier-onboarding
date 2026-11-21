import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface BaseFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
}

type InputFieldProps = BaseFieldProps & InputHTMLAttributes<HTMLInputElement>;
type SelectFieldProps = BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: Array<{ value: string; label: string }>;
  };
type TextAreaFieldProps = BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextField({ label, htmlFor, hint, ...inputProps }: InputFieldProps) {
  return (
    <label className="form-field" htmlFor={htmlFor}>
      <span className="form-field__label">{label}</span>
      <input id={htmlFor} className="form-field__control" {...inputProps} />
      {hint ? <span className="form-field__hint">{hint}</span> : null}
    </label>
  );
}

export function SelectField({ label, htmlFor, hint, options, ...selectProps }: SelectFieldProps) {
  return (
    <label className="form-field" htmlFor={htmlFor}>
      <span className="form-field__label">{label}</span>
      <select id={htmlFor} className="form-field__control" {...selectProps}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className="form-field__hint">{hint}</span> : null}
    </label>
  );
}

export function TextAreaField({ label, htmlFor, hint, ...textareaProps }: TextAreaFieldProps) {
  return (
    <label className="form-field" htmlFor={htmlFor}>
      <span className="form-field__label">{label}</span>
      <textarea id={htmlFor} className="form-field__control form-field__control--textarea" {...textareaProps} />
      {hint ? <span className="form-field__hint">{hint}</span> : null}
    </label>
  );
}
