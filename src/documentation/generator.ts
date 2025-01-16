import { buildSchema } from 'graphql';
import logger from '../utils/logger';
import generateMarkdown from 'graphql-markdown';

export class DocumentationGenerator {
  public async generateDocs(
    schemaString: string,
  ): Promise<Record<string, unknown>> {
    try {
      const schema = buildSchema(schemaString);

      const config: any = {
        schema,
        title: 'E-Commerce GraphQL API Documentation',
        baseUrl: '/api/graphql',
        outputDir: './docs',
        sections: {
          types: true,
          queries: true,
          mutations: true,
          directives: true,
          scalars: true,
          enums: true,
          examples: true,
        },
      };

      await generateMarkdown(config);
      logger.info('Dokumentation erfolgreich generiert');

      return config;
    } catch (error) {
      let errorMessage = 'Unbekannter Fehler';
      if (error instanceof Error) {
        logger.error('Fehler bei der Dokumentationsgenerierung', {
          error: error.message,
        });
        errorMessage = error.message;
      } else {
        logger.error('Fehler bei der Dokumentationsgenerierung', {
          error,
        });
      }
      throw new Error(`Dokumentationsfehler: ${errorMessage}`);
    }
  }
}
