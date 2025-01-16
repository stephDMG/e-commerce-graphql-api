//src/@types/graphql-schema.d.ts
import { DocumentNode } from 'graphql';

declare module '@graphql/schema' {
  export const typeDefs: DocumentNode;
}
