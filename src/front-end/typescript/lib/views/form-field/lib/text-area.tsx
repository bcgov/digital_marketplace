import { debounce, isEqual } from 'lodash';
import { ChangeEvent, ChangeEventHandler, CSSProperties, default as React, KeyboardEventHandler } from 'react';

// We need to define a stateful React Component because React has a known issue that causes
// <textarea> field's cursors to jump around when we update their values using state management.
// In my opinion, the React team should fix this, but they don't view it as a bug (argh).
// Using a stateful component that tracks cursor position is the industry standard workaround
// as of 2019.03.04.
// Workaround idea: https://stackoverflow.com/questions/46000544/react-controlled-input-cursor-jumps
// Related React GitHub Issue: https://github.com/facebook/react/issues/12762

export type OnChangeDebounced = () => void;

export interface Props {
  id: string;
  value?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  style?: CSSProperties;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  onChangeDebounced?: OnChangeDebounced;
  onKeyUp?: KeyboardEventHandler<HTMLTextAreaElement>;
  autoFocus?: boolean;
}

export class View extends React.Component<Props> {

  private ref: HTMLTextAreaElement | null;
  private selectionStart: number | null;
  private selectionEnd: number | null;
  private onChangeDebounced: OnChangeDebounced | null;
  private value: string;
  private className: string;
  private disabled: boolean;
  private style: CSSProperties;

  constructor(props: Props) {
    super(props);
    this.ref = null;
    this.selectionStart = null;
    this.selectionEnd = null;
    this.onChangeDebounced = null;
    this.value = '';
    this.className = '';
    this.disabled = false;
    this.style = {};
  }

  public render() {
    const {
      id,
      value = '',
      placeholder = '',
      className = '',
      disabled = false,
      style = {},
      onChange,
      onChangeDebounced,
      onKeyUp,
      autoFocus = false
    } = this.props;
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
    this.style = style;
    return (
      <textarea
        name={id}
        id={id}
        value={value}
        placeholder={disabled ? '' : placeholder}
        disabled={disabled}
        className={className}
        style={style}
        onChange={this.onChange.bind(this, onChange)}
        onKeyUp={onKeyUp}
        ref={ref => { this.ref = ref; }}
        autoFocus={autoFocus} />
    );
  }

  public shouldComponentUpdate(nextProps: Props) {
    return this.value !== (nextProps.value || '') || this.className !== (nextProps.className || '') || (this.disabled !== !!nextProps.disabled) || !isEqual(this.style, nextProps.style || {});
  }

  public componentDidUpdate() {
    if (this.ref && this.selectionStart) {
      this.ref.setSelectionRange(this.selectionStart, this.selectionEnd || this.selectionStart);
    }
  }

  private onChange(onChange: ChangeEventHandler<HTMLTextAreaElement>, event: ChangeEvent<HTMLTextAreaElement>) {
    this.selectionStart = event.target.selectionStart;
    this.selectionEnd = event.target.selectionEnd;
    onChange(event);
    if (this.onChangeDebounced) { this.onChangeDebounced(); }
  }
}
