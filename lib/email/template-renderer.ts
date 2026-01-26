'use server';

import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Loads an email template HTML file from the templates directory
 * 
 * @param templateName - Name of the template file (e.g., 'booking-confirmation.html')
 * @returns Template HTML content as string
 * @throws Error if template file not found
 */
async function loadTemplate(templateName: string): Promise<string> {
  try {
    // Build full path to template file: lib/email/templates/{templateName}
    const templatePath = join(process.cwd(), 'lib', 'email', 'templates', templateName);
    const template = await readFile(templatePath, 'utf-8');
    return template;
  } catch (error: any) {
    console.error(`Failed to load template ${templateName}:`, error);
    throw new Error(`Template not found: ${templateName}`);
  }
}

/**
 * Replaces all template variables in the format {{variableName}} with actual values
 * 
 * Process:
 * 1. Iterates through all provided variables
 * 2. Finds all occurrences of {{variableName}} in the template
 * 3. Replaces them with the corresponding value
 * 
 * Example:
 * Template: "Hello {{userName}}"
 * Variables: { userName: "John" }
 * Result: "Hello John"
 * 
 * @param template - HTML template string with {{variable}} placeholders
 * @param variables - Object mapping variable names to their values
 * @returns Template with all variables replaced
 */
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let rendered = template;
  
  // Replace each {{variable}} with its value
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, value);
  }
  
  return rendered;
}

/**
 * Renders an email template by loading the HTML file and replacing all variables
 * 
 * Process:
 * 1. Loads the template HTML file from templates directory
 * 2. Replaces all {{variableName}} placeholders with actual values
 * 3. Returns the fully rendered HTML ready to send
 * 
 * @param templateName - Name of the template file (e.g., 'booking-confirmation.html')
 * @param variables - Object mapping variable names to their values
 * @returns Fully rendered HTML email content
 */
export async function renderEmailTemplate(
  templateName: string,
  variables: Record<string, string>
): Promise<string> {
  const template = await loadTemplate(templateName);
  return replaceTemplateVariables(template, variables);
}
