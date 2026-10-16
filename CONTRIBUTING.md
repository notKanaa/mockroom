# Contributing to Mockroom

Thanks for helping! The most useful contribution needs no code at all: **an interview pack** for a technology you know.

> 🇫🇷 Tu peux écrire un pack en français ou en anglais. Un pack, c'est un simple fichier texte : pas besoin de savoir coder.

- [Write an interview pack](#write-an-interview-pack) (no coding)
- [Work on the code](#work-on-the-code)

## Write an interview pack

A pack is the content of an interview for one technology, at one level, in one language: for example "React, junior, in English". It's a single [YAML](https://yaml.org) file in the [`packs`](packs) folder. YAML is plain text with a few simple rules, explained below.

The interviewer asks the pack's questions one at a time. The **key points** are what a good answer covers: the interviewer uses them to dig into incomplete answers, and the debrief uses them to tell the candidate what was missing. The **resources** are what the candidate is told to study afterwards.

### Annotated example

Lines starting with `#` are comments: Mockroom ignores them, and you don't need them in your pack.

```yaml
# The pack's unique name. It must be the file name without ".yaml":
# this file is packs/react-junior-en.yaml.
# Use lowercase letters, digits and dashes: technology-level-language.
id: react-junior-en

# The technology, written the usual way. Packs for the same technology
# must spell it the same way, so they show up together in the filters.
technology: React

# junior, mid or senior.
level: junior

# The language of the interview: en (English) or fr (French).
language: en

# The name shown in the pack list.
title: React — Junior

# The topics the interview covers. Mockroom asks one question per theme,
# going through the themes in order, then starts again with each theme's
# second question, and so on (up to 5 questions per interview for now).
themes:
  # Each theme starts with "- " (dash, space). Everything that belongs to it
  # is indented by 4 spaces, lined up under "name".
  - name: Effects

    # Questions the interviewer can ask on this theme. At least one.
    questions:
      - How does the useEffect hook work, and when does its effect run?

    # What a good answer covers, one point per line. At least one.
    # Write them as facts, precise enough to check an answer against.
    key_points:
      - useEffect synchronises a component with something outside React
      - The effect runs after render; the dependency array controls when it runs again
      - The returned cleanup function runs before the next effect and on unmount

    # Where to study this theme. At least one. Official documentation is best.
    resources:
      - title: Synchronizing with Effects
        url: https://react.dev/learn/synchronizing-with-effects

  # The next theme, at the same indentation as the first one.
  - name: Lists and keys
    questions:
      - Why does React need a key prop when you render a list?
    key_points:
      - Keys let React match list items between renders
      - A good key is stable and unique among siblings, such as an id from the data
    resources:
      - title: Rendering Lists
        url: https://react.dev/learn/rendering-lists
```

The full built-in pack is [`packs/react-junior-en.yaml`](packs/react-junior-en.yaml).

For complete packs at two levels and in both languages, see the Symfony packs: [`symfony-junior-en`](packs/symfony-junior-en.yaml), [`symfony-junior-fr`](packs/symfony-junior-fr.yaml), [`symfony-mid-en`](packs/symfony-mid-en.yaml) and [`symfony-mid-fr`](packs/symfony-mid-fr.yaml). They show how a theme grows from junior to mid level, how French packs are written in natural French rather than translated word for word, and how to quote YAML text that contains `: ` or `#`, such as PHP attributes like `#[Route]`.

### Fields

| Field        | What to write                                                              |
| ------------ | -------------------------------------------------------------------------- |
| `id`         | The file name without `.yaml`, e.g. `python-mid-fr`                        |
| `technology` | The technology's usual name, e.g. `Python`, `Symfony`, `C#`               |
| `level`      | `junior`, `mid` or `senior`                                                |
| `language`   | `en` or `fr`                                                               |
| `title`      | The name shown in the pack list, e.g. `Python — Mid-level`                 |
| `themes`     | At least one theme. Each theme has the four fields below                   |
| `name`       | The theme's name, unique in the pack                                       |
| `questions`  | At least one question                                                      |
| `key_points` | At least one point a good answer covers                                    |
| `resources`  | At least one link, each with a `title` and a `url` starting with `https://` |

Every field is required, and no other field is allowed.

### YAML in three rules

1. **Indent with spaces, never tabs.** Items of the same list must start at the same column.
2. **Lists** are lines starting with `- ` (dash, space).
3. **Wrap text in double quotes when it contains `: `** (a colon followed by a space) **or ` #`** (a space followed by `#`, which starts a comment), or when it starts with a special character such as `[`, `{`, `&`, `*`, `!`, `|`, `>`, `%`, `@` or `` ` ``. Inside double quotes, write `\"` for a double quote:

   ```yaml
   - "Glossary: generator"
   - "What does #include do in C++?"
   ```

### Tips for a good pack

- **3 to 8 themes**, from the most common topics to the more advanced ones.
- **Realistic questions**, the kind a recruiter really asks for this level. A theme can have several questions.
- **Precise key points.** "Explains the cleanup function" helps less than "The cleanup function runs before the next effect and on unmount".
- **Accurate content.** Check your key points against the official documentation, and prefer it for resources.
- **Your own words.** Don't copy questions or answers from paid courses or other sites.

### Add your pack

You can do everything from the GitHub website:

1. Open the [`packs`](packs) folder on GitHub, then click **Add file → Create new file**.
2. Name the file after your pack's id, e.g. `python-junior-en.yaml`, and write the pack.
3. Click **Commit changes** and choose **Create a new branch and start a pull request**. GitHub creates a copy of the project for you if needed.
4. Open the pull request. Mockroom checks your pack automatically: if something is wrong, the check fails and the problem is shown next to the line at fault, under **Files changed**. Fix it, commit again, and the check runs again.

Each problem says where it is and what to change, for example:

```text
packs/python-junior-en.yaml:12:5: themes › theme 2 › key_points is missing. Add at least one key point.
```

That's line 12, column 5: the second theme has no `key_points`.

If you have the project on your computer, you can run the same check before opening a pull request:

```bash
npm run validate-packs
```

## Work on the code

Mockroom is a TypeScript app: a Node server serving a React UI. See the [README](README.md#contributing-dev-mode) to run it in dev mode. Before opening a pull request, run:

```bash
npm run typecheck
npm test
```

Tests go through the HTTP API with a fake AI model (`test/support/scripted-model.ts`), so they are fast and need no API key.

The interface is in English and French. Every text the candidate sees lives in a dictionary, never in a component: `src/ui/messages.ts` for the UI, `src/server/messages.ts` for the messages the server sends back (errors, connection tests). Add a text in both languages; a test checks that both dictionaries have the same keys.
