/* eslint-disable */
const fs = require("fs");
const path = require("path");
const glob = require("glob");

const rootDir = path.join(__dirname);

function addPrefixToClasses(classString, prefix = "tw:") {
  if (!classString || typeof classString !== "string") return classString;

  // Split by spaces and filter out empty strings
  const classNames = classString
    .split(/\s+/)
    .filter((className) => className.trim());

  const prefixedClassNames = classNames.map((className) => {
    // Skip if already has the prefix
    if (className.startsWith(prefix)) {
      return className;
    }
    // Skip data attributes, aria attributes, and other special selectors
    if (
      className.startsWith("data-") ||
      className.startsWith("aria-") ||
      className.startsWith("[") ||
      (className.includes(":") &&
        !className.startsWith("hover:") &&
        !className.startsWith("focus:") &&
        !className.startsWith("active:") &&
        !className.startsWith("disabled:") &&
        !className.startsWith("group-"))
    ) {
      return className;
    }
    return `${prefix}${className}`;
  });

  return prefixedClassNames.join(" ");
}

function processFileContent(content) {
  let result = content;

  // Process standard className patterns
  result = result.replace(
    /className=["']([\w\s\-:\/\[\]().,_]+)["']/g,
    (match, classString) => {
      const prefixed = addPrefixToClasses(classString);
      return `className="${prefixed}"`;
    }
  );

  // Process template literal className patterns
  result = result.replace(/className=\{`([^`]*)`\}/g, (match, classString) => {
    const prefixed = addPrefixToClasses(classString);
    return `className={\`${prefixed}\`}`;
  });

  // NEW: Process multi-line cn() calls with multiple string arguments
  result = result.replace(
    /cn\(\s*((?:["'][^"']*["']\s*,?\s*)+)\s*\)/gs,
    (match, argsString) => {
      // Extract individual string arguments
      const stringArgs = argsString.match(/["']([^"']*)["']/g);
      if (stringArgs) {
        let processedMatch = match;
        stringArgs.forEach((stringArg) => {
          const classString = stringArg.slice(1, -1); // Remove quotes
          const prefixed = addPrefixToClasses(classString);
          processedMatch = processedMatch.replace(stringArg, `"${prefixed}"`);
        });
        return processedMatch;
      }
      return match;
    }
  );

  // Process single-line cn() function calls with string literals
  result = result.replace(/cn\(\s*["']([^"']+)["']/g, (match, classString) => {
    const prefixed = addPrefixToClasses(classString);
    return match.replace(classString, prefixed);
  });

  // Process cn() function calls with template literals
  result = result.replace(/cn\(\s*`([^`]*)`/g, (match, classString) => {
    const prefixed = addPrefixToClasses(classString);
    return match.replace(classString, prefixed);
  });

  // NEW: Process classNames object properties
  result = result.replace(
    /classNames\s*=\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs,
    (match, objectContent) => {
      // Process string values in the object
      const processedContent = objectContent.replace(
        /:\s*["']([^"']*)["']/g,
        (propMatch, classString) => {
          const prefixed = addPrefixToClasses(classString);
          return propMatch.replace(classString, prefixed);
        }
      );

      // Process cn() calls within the object
      const finalContent = processedContent.replace(
        /cn\(\s*((?:["'][^"']*["']\s*,?\s*)+)\s*\)/gs,
        (cnMatch, argsString) => {
          const stringArgs = argsString.match(/["']([^"']*)["']/g);
          if (stringArgs) {
            let processedCnMatch = cnMatch;
            stringArgs.forEach((stringArg) => {
              const classString = stringArg.slice(1, -1);
              const prefixed = addPrefixToClasses(classString);
              processedCnMatch = processedCnMatch.replace(
                stringArg,
                `"${prefixed}"`
              );
            });
            return processedCnMatch;
          }
          return cnMatch;
        }
      );

      return `classNames = {${finalContent}}`;
    }
  );

  return result;
}

glob(
  "**/*.{js,jsx,tsx,ts}",
  { cwd: rootDir, ignore: ["node_modules/**", "dist/**", "build/**"] },
  (er, files) => {
    if (er) {
      console.error("Error finding files:", er);
      return;
    }

    console.log(`Found ${files.length} files to process...`);

    files.forEach((file) => {
      const filePath = path.join(rootDir, file);

      fs.readFile(filePath, "utf-8", (err, data) => {
        if (err) {
          console.error(`Error reading file ${file}:`, err);
          return;
        }

        const result = processFileContent(data);

        // Only write if content changed
        if (result !== data) {
          fs.writeFile(filePath, result, "utf-8", (err) => {
            if (err) {
              console.error(`Error writing file ${file}:`, err);
            } else {
              console.log(`✓ Processed ${file}`);
            }
          });
        }
      });
    });
  }
);
