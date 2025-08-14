export type GenericFormState = {
  [key: string]: any;
};

export type GenericDispatch = (msg: any) => void;

export const sayHelloAction = async (
  state: GenericFormState,
  dispatch: GenericDispatch,
  name: string
): Promise<string> => {
  alert(`Hello, ${name}!`);
  return `Hello, ${name}!`;
};

export const sayHelloCopilotAction = {
  name: "sayHello",
  description: "Say hello to someone.",
  parameters: [
    {
      name: "name",
      type: "string",
      description: "name of the person to say greet"
    }
  ],
  action: sayHelloAction
};
