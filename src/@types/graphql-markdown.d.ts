declare module 'graphql-markdown' {
  import { GraphQLSchema } from 'graphql';

  export interface MarkdownConfig {
    [key: string]: unknown;
    /**
     * GraphQL schema instance
     */
    schema: GraphQLSchema;

    /**
     * Title of the documentation
     */
    title?: string;

    /**
     * Base URL for the API
     */
    baseUrl?: string;

    /**
     * Output directory for generated documentation
     */
    outputDir?: string;

    /**
     * Sections to include in documentation
     */
    sections?: {
      types?: boolean;
      queries?: boolean;
      mutations?: boolean;
      directives?: boolean;
      scalars?: boolean;
      enums?: boolean;
      examples?: boolean;
    };

    /**
     * Custom pages configuration
     */
    customPages?: {
      [key: string]: {
        title: string;
        content: string;
      };
    };
  }

  /**
   * Generates markdown documentation from GraphQL schema
   */
  export default function generateMarkdown(
    config: MarkdownConfig,
  ): Promise<Record<string, unknown>>;
}
