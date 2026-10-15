import type { Pack } from "./pack.js";

/** Built-in sample pack, until the full React reference pack lands (issue #11). */
export const reactJuniorEn: Pack = {
  id: "react-junior-en",
  technology: "React",
  level: "junior",
  language: "en",
  title: "React — Junior",
  themes: [
    {
      name: "Components and JSX",
      questions: ["What is JSX, and what does it become once your code is compiled?"],
      keyPoints: [
        "JSX is a syntax extension that lets you describe UI with HTML-like markup in JavaScript",
        "It compiles to function calls (React.createElement or the jsx runtime) that create React elements",
        "Expressions go inside curly braces; a component returns a single root element or a fragment",
      ],
      resources: [
        { title: "Writing Markup with JSX", url: "https://react.dev/learn/writing-markup-with-jsx" },
      ],
    },
    {
      name: "Props and state",
      questions: ["What is the difference between props and state in a React component?"],
      keyPoints: [
        "Props are passed in by the parent and are read-only for the component",
        "State is owned by the component and changed with its setter, which triggers a re-render",
        "Data flows down through props; children notify parents through callback props",
      ],
      resources: [
        { title: "Passing Props to a Component", url: "https://react.dev/learn/passing-props-to-a-component" },
        { title: "State: A Component's Memory", url: "https://react.dev/learn/state-a-components-memory" },
      ],
    },
    {
      name: "Effects",
      questions: ["How does the useEffect hook work, and when does its effect run?"],
      keyPoints: [
        "useEffect synchronises a component with something outside React, such as a subscription or a request",
        "The effect runs after render; the dependency array controls when it runs again",
        "An empty array runs it once after mount; no array runs it after every render",
        "The returned cleanup function runs before the next effect and on unmount",
      ],
      resources: [
        { title: "Synchronizing with Effects", url: "https://react.dev/learn/synchronizing-with-effects" },
      ],
    },
    {
      name: "Lists and keys",
      questions: ["Why does React need a key prop when you render a list, and what makes a good key?"],
      keyPoints: [
        "Keys let React match list items between renders to update them efficiently and keep their state",
        "A good key is stable and unique among siblings, such as an id from the data",
        "Array indexes break when items are reordered, inserted or removed",
      ],
      resources: [{ title: "Rendering Lists", url: "https://react.dev/learn/rendering-lists" }],
    },
    {
      name: "Forms",
      questions: ["What is a controlled input in React, and how would you build one?"],
      keyPoints: [
        "A controlled input gets its value from React state and updates it in onChange",
        "React state is the single source of truth for the field",
        "An uncontrolled input keeps its own value in the DOM, read with a ref",
      ],
      resources: [
        {
          title: "Controlling an input with a state variable",
          url: "https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable",
        },
      ],
    },
  ],
};
