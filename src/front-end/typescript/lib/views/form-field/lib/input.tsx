import { debounce } from 'lodash';
import { ChangeEvent, ChangeEventHandler, default as React, KeyboardEventHandler } from 'react';

// We need to define a stateful React Component because React has a known issue that causes
// <input> field's cursors to jump around when we asynchronously update their values using state management.
// In my opinion, the React team should fix this, but they don't view it as a bug (argh).
// Using a stateful component that tracks cursor position is the industry standard workaround
// as of 2019.03.04.
// Workaround idea: https://stackoverflow.com/questions/46000544/react-controlled-input-cursor-jumps
// Related React GitHub Issue: https://github.com/facebook/react/issues/12762

export type OnChangeDebounced = () => void;

export interface Props {
  type: 'text' | 'email' | 'password' | 'date' | 'time' | 'datetime-local' | 'number';
  id: string;
  value?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  min?: string;
  max?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onChangeDebounced?: OnChangeDebounced;
  onKeyUp?: KeyboardEventHandler<HTMLInputElement>;
}

export class View extends React.Component<Props> {

  private ref: HTMLInputElement | null;
  private selectionStart: number | null;
  private selectionEnd: number | null;
  private onChangeDebounced: OnChangeDebounced | null;
  private value: string;
  private className: string;
  private disabled: boolean;

  constructor(props: Props) {
    super(props);
    this.ref = null;
    this.selectionStart = null;
    this.selectionEnd = null;
    this.onChangeDebounced = null;
    this.value = '';
    this.className = '';
    this.disabled = false;
  }

  public render() {
    const {
      id,
      value = '',
      placeholder = '',
      className = '',
      disabled = false,
      autoFocus = false,
      min = '',
      max = '',
      onChange,
      onChangeDebounced,
      onKeyUp
    } = this.props;
    // Override the input type to text for emails to support selectionStart selection state.
    const inputType = this.props.type === 'email' ? 'text' : this.props.type;
    // Manage this.onChangeDebounced.
    // This is pretty gross, but the only (simple) way to support real-time validation
    // and live user feedback of user input. We assume that onChangeDebounced never
    // *semantically* changes after it has been passed as a prop for the first time.
    // This allows us to ensure calls to this.onChangeDebounced are properly debounced.
    // Effectively, you can't change the functionality of the prop `onChangeDebounced`.
    if (!this.onChangeDebounced && onChangeDebounced) {
      this.onChangeDebounced = debounce(() => {
        // Update the component's cursor selection state.
        if (this.ref) {
          this.selectionStart = this.ref.selectionStart;
          this.selectionEnd = this.ref.selectionEnd;
        }
        // Run the debounced change handler.
        if (onChangeDebounced) {
          onChangeDebounced();
        }
      }, 500);
    }
    // Update the component's store of the state.
    this.value = value;
    this.className = className;
    this.disabled = disabled;
    return (
      <input
        type={inputType}
        name={id}
        id={id}
        value={value}
        placeholder={disabled ? '' : placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        min={min}
        max={max}
        className={className}
        onChange={this.onChange.bind(this, onChange)}
        onKeyUp={onKeyUp}
        ref={ref => { this.ref = ref; }} />
    );
  }

  public shouldComponentUpdate(nextProps: Props) {
    const shouldUpdate = this.value !== (nextProps.value || '') || this.className !== (nextProps.className || '') || (this.disabled !== !!nextProps.disabled);
    return shouldUpdate;
  }

  public componentDidUpdate() {
    if (this.ref && this.selectionStart) {
      this.ref.setSelectionRange(this.selectionStart, this.selectionEnd || this.selectionStart);
    }
  }

  private onChange(onChange: ChangeEventHandler<HTMLInputElement>, event: ChangeEvent<HTMLInputElement>) {
    this.selectionStart = event.target.selectionStart;
    this.selectionEnd = event.target.selectionEnd;
    onChange(event);
    if (this.onChangeDebounced) { this.onChangeDebounced(); }
  }
}
