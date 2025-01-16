import { mergeTypeDefs } from '@graphql-tools/merge';
import { loadFilesSync } from '@graphql-tools/load-files';
import * as path from 'path';
import logger from '../utils/logger';

const typesArray = loadFilesSync(path.join(__dirname, './types'), {
  extensions: ['graphql'],
});
logger.info('Geladene Schema-Dateien', { files: typesArray });

export const typeDefs = mergeTypeDefs(typesArray);
