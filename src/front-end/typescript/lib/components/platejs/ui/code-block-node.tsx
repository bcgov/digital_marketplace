"use client";

import * as React from "react";

import { formatCodeBlock, isLangSupported } from "@platejs/code-block";
import { BracesIcon, Check, CheckIcon, CopyIcon } from "lucide-react";
import { type TCodeBlockElement, type TCodeSyntaxLeaf, NodeApi } from "platejs";
import {
  type PlateElementProps,
  type PlateLeafProps,
  PlateElement,
  PlateLeaf
} from "platejs/react";
import { useEditorRef, useElement, useReadOnly } from "platejs/react";

import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "./utils";

export function CodeBlockElement(props: PlateElementProps<TCodeBlockElement>) {
  const { editor, element } = props;

  return (
    <PlateElement
      className="tw:py-1 tw:**:[.hljs-addition]:bg-[#f0fff4] tw:**:[.hljs-addition]:text-[#22863a] tw:dark:**:[.hljs-addition]:bg-[#3c5743] tw:dark:**:[.hljs-addition]:text-[#ceead5] tw:**:[.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id,.hljs-variable]:text-[#005cc5] tw:dark:**:[.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id,.hljs-variable]:text-[#6596cf] tw:**:[.hljs-built\\\\_in,.hljs-symbol]:text-[#e36209] tw:dark:**:[.hljs-built\\\\_in,.hljs-symbol]:text-[#c3854e] tw:**:[.hljs-bullet]:text-[#735c0f] tw:**:[.hljs-comment,.hljs-code,.hljs-formula]:text-[#6a737d] tw:dark:**:[.hljs-comment,.hljs-code,.hljs-formula]:text-[#6a737d] tw:**:[.hljs-deletion]:bg-[#ffeef0] tw:**:[.hljs-deletion]:text-[#b31d28] tw:dark:**:[.hljs-deletion]:bg-[#473235] tw:dark:**:[.hljs-deletion]:text-[#e7c7cb] tw:**:[.hljs-emphasis]:italic tw:**:[.hljs-keyword,.hljs-doctag,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language\\\\_]:text-[#d73a49] tw:dark:**:[.hljs-keyword,.hljs-doctag,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language\\\\_]:text-[#ee6960] tw:**:[.hljs-name,.hljs-quote,.hljs-selector-tag,.hljs-selector-pseudo]:text-[#22863a] tw:dark:**:[.hljs-name,.hljs-quote,.hljs-selector-tag,.hljs-selector-pseudo]:text-[#36a84f] tw:**:[.hljs-regexp,.hljs-string,.hljs-meta_.hljs-string]:text-[#032f62] tw:dark:**:[.hljs-regexp,.hljs-string,.hljs-meta_.hljs-string]:text-[#3593ff] tw:**:[.hljs-section]:font-bold tw:**:[.hljs-section]:text-[#005cc5] tw:dark:**:[.hljs-section]:text-[#61a5f2] tw:**:[.hljs-strong]:font-bold tw:**:[.hljs-title,.hljs-title.class\\\\_,.hljs-title.class\\\\_.inherited\\\\_\\\\_,.hljs-title.function\\\\_]:text-[#6f42c1] tw:dark:**:[.hljs-title,.hljs-title.class\\\\_,.hljs-title.class\\\\_.inherited\\\\_\\\\_,.hljs-title.function\\\\_]:text-[#a77bfa]"
      {...props}>
      <div className="tw:relative tw:rounded-md tw:bg-muted/50">
        <pre className="tw:overflow-x-auto tw:p-8 tw:pr-4 tw:font-mono tw:text-sm tw:leading-[normal] tw:[tab-size:2] tw:print:break-inside-avoid">
          <code>{props.children}</code>
        </pre>

        <div
          className="tw:absolute tw:top-1 tw:right-1 tw:z-10 tw:flex tw:gap-0.5 tw:select-none"
          contentEditable={false}>
          {isLangSupported(element.lang) && (
            <Button
              size="icon"
              variant="ghost"
              className="tw:size-6 tw:text-xs"
              onClick={() => formatCodeBlock(editor, { element })}
              title="Format code">
              <BracesIcon className="tw:!size-3.5 tw:text-muted-foreground" />
            </Button>
          )}

          <CodeBlockCombobox />

          <CopyButton
            size="icon"
            variant="ghost"
            className="tw:size-6 tw:gap-1 tw:text-xs tw:text-muted-foreground"
            value={() => NodeApi.string(element)}
          />
        </div>
      </div>
    </PlateElement>
  );
}

function CodeBlockCombobox() {
  const [open, setOpen] = React.useState(false);
  const readOnly = useReadOnly();
  const editor = useEditorRef();
  const element = useElement<TCodeBlockElement>();
  const value = element.lang || "plaintext";
  const [searchValue, setSearchValue] = React.useState("");

  const items = React.useMemo(
    () =>
      languages.filter(
        (language) =>
          !searchValue ||
          language.label.toLowerCase().includes(searchValue.toLowerCase())
      ),
    [searchValue]
  );

  if (readOnly) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="tw:h-6 tw:justify-between tw:gap-1 tw:px-2 tw:text-xs tw:text-muted-foreground tw:select-none"
          aria-expanded={open}
          role="combobox">
          {languages.find((language) => language.value === value)?.label ??
            "Plain Text"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="tw:w-[200px] tw:p-0"
        onCloseAutoFocus={() => setSearchValue("")}>
        <Command shouldFilter={false}>
          <CommandInput
            className="tw:h-9"
            value={searchValue}
            onValueChange={(value) => setSearchValue(value)}
            placeholder="Search language..."
          />
          <CommandEmpty>No language found.</CommandEmpty>

          <CommandList className="tw:h-[344px] tw:overflow-y-auto">
            <CommandGroup>
              {items.map((language) => (
                <CommandItem
                  key={language.label}
                  className="tw:cursor-pointer"
                  value={language.value}
                  onSelect={(value) => {
                    editor.tf.setNodes<TCodeBlockElement>(
                      { lang: value },
                      { at: element }
                    );
                    setSearchValue(value);
                    setOpen(false);
                  }}>
                  <Check
                    className={cn(
                      value === language.value
                        ? "tw:opacity-100"
                        : "tw:opacity-0"
                    )}
                  />
                  {language.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CopyButton({
  value,
  ...props
}: { value: (() => string) | string } & Omit<
  React.ComponentProps<typeof Button>,
  "value"
>) {
  const [hasCopied, setHasCopied] = React.useState(false);

  React.useEffect(() => {
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  }, [hasCopied]);

  return (
    <Button
      onClick={() => {
        void navigator.clipboard.writeText(
          typeof value === "function" ? value() : value
        );
        setHasCopied(true);
      }}
      {...props}>
      <span className="tw:sr-only">Copy</span>
      {hasCopied ? (
        <CheckIcon className="tw:!size-3" />
      ) : (
        <CopyIcon className="tw:!size-3" />
      )}
    </Button>
  );
}

export function CodeLineElement(props: PlateElementProps) {
  return <PlateElement {...props} />;
}

export function CodeSyntaxLeaf(props: PlateLeafProps<TCodeSyntaxLeaf>) {
  const tokenClassName = props.leaf.className as string;

  return <PlateLeaf className={tokenClassName} {...props} />;
}

const languages: { label: string; value: string }[] = [
  { label: "Auto", value: "auto" },
  { label: "Plain Text", value: "plaintext" },
  { label: "ABAP", value: "abap" },
  { label: "Agda", value: "agda" },
  { label: "Arduino", value: "arduino" },
  { label: "ASCII Art", value: "ascii" },
  { label: "Assembly", value: "x86asm" },
  { label: "Bash", value: "bash" },
  { label: "BASIC", value: "basic" },
  { label: "BNF", value: "bnf" },
  { label: "C", value: "c" },
  { label: "C#", value: "csharp" },
  { label: "C++", value: "cpp" },
  { label: "Clojure", value: "clojure" },
  { label: "CoffeeScript", value: "coffeescript" },
  { label: "Coq", value: "coq" },
  { label: "CSS", value: "css" },
  { label: "Dart", value: "dart" },
  { label: "Dhall", value: "dhall" },
  { label: "Diff", value: "diff" },
  { label: "Docker", value: "dockerfile" },
  { label: "EBNF", value: "ebnf" },
  { label: "Elixir", value: "elixir" },
  { label: "Elm", value: "elm" },
  { label: "Erlang", value: "erlang" },
  { label: "F#", value: "fsharp" },
  { label: "Flow", value: "flow" },
  { label: "Fortran", value: "fortran" },
  { label: "Gherkin", value: "gherkin" },
  { label: "GLSL", value: "glsl" },
  { label: "Go", value: "go" },
  { label: "GraphQL", value: "graphql" },
  { label: "Groovy", value: "groovy" },
  { label: "Haskell", value: "haskell" },
  { label: "HCL", value: "hcl" },
  { label: "HTML", value: "html" },
  { label: "Idris", value: "idris" },
  { label: "Java", value: "java" },
  { label: "JavaScript", value: "javascript" },
  { label: "JSON", value: "json" },
  { label: "Julia", value: "julia" },
  { label: "Kotlin", value: "kotlin" },
  { label: "LaTeX", value: "latex" },
  { label: "Less", value: "less" },
  { label: "Lisp", value: "lisp" },
  { label: "LiveScript", value: "livescript" },
  { label: "LLVM IR", value: "llvm" },
  { label: "Lua", value: "lua" },
  { label: "Makefile", value: "makefile" },
  { label: "Markdown", value: "markdown" },
  { label: "Markup", value: "markup" },
  { label: "MATLAB", value: "matlab" },
  { label: "Mathematica", value: "mathematica" },
  { label: "Mermaid", value: "mermaid" },
  { label: "Nix", value: "nix" },
  { label: "Notion Formula", value: "notion" },
  { label: "Objective-C", value: "objectivec" },
  { label: "OCaml", value: "ocaml" },
  { label: "Pascal", value: "pascal" },
  { label: "Perl", value: "perl" },
  { label: "PHP", value: "php" },
  { label: "PowerShell", value: "powershell" },
  { label: "Prolog", value: "prolog" },
  { label: "Protocol Buffers", value: "protobuf" },
  { label: "PureScript", value: "purescript" },
  { label: "Python", value: "python" },
  { label: "R", value: "r" },
  { label: "Racket", value: "racket" },
  { label: "Reason", value: "reasonml" },
  { label: "Ruby", value: "ruby" },
  { label: "Rust", value: "rust" },
  { label: "Sass", value: "scss" },
  { label: "Scala", value: "scala" },
  { label: "Scheme", value: "scheme" },
  { label: "SCSS", value: "scss" },
  { label: "Shell", value: "shell" },
  { label: "Smalltalk", value: "smalltalk" },
  { label: "Solidity", value: "solidity" },
  { label: "SQL", value: "sql" },
  { label: "Swift", value: "swift" },
  { label: "TOML", value: "toml" },
  { label: "TypeScript", value: "typescript" },
  { label: "VB.Net", value: "vbnet" },
  { label: "Verilog", value: "verilog" },
  { label: "VHDL", value: "vhdl" },
  { label: "Visual Basic", value: "vbnet" },
  { label: "WebAssembly", value: "wasm" },
  { label: "XML", value: "xml" },
  { label: "YAML", value: "yaml" }
];
