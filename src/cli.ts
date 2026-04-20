import { stat } from "node:fs/promises";
import path from "node:path";
import inquirer from "inquirer";
import { CliOptions } from "./types";

async function isReadableDirectory(value: string): Promise<boolean | string> {
  const resolved = path.resolve(process.cwd(), value.trim());
  try {
    const s = await stat(resolved);
    if (!s.isDirectory()) {
      return `"${resolved}" is not a directory`;
    }
    return true;
  } catch {
    return `Cannot access "${resolved}" — check that the path exists and is readable`;
  }
}

export async function promptCliOptions(): Promise<CliOptions> {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "targetDirectory",
      message: "Image directory to scan:",
      default: process.cwd(),
      validate: isReadableDirectory,
      filter: (value: string) => path.resolve(process.cwd(), value.trim()),
    },
    {
      type: "confirm",
      name: "recursive",
      message: "Scan subdirectories recursively?",
      default: true,
    },
    {
      type: "list",
      name: "outputMode",
      message: "Output format:",
      choices: [
        { name: "Human-readable table", value: "table" },
        { name: "JSON", value: "json" },
      ],
      default: "table",
    },
    {
      type: "list",
      name: "groupBy",
      message: "Group statistics by:",
      choices: [
        { name: "No grouping", value: "none" },
        { name: "Camera name", value: "camera" },
      ],
      default: "none",
    },
  ]);

  return answers as CliOptions;
}

