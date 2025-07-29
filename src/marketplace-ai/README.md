<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# Digital Marketplace AI Service

This service provides vector search capabilities for the Digital Marketplace by syncing data from PostgreSQL to ChromaDB.

## Features

- **Automated Sync**: Syncs data from PostgreSQL to ChromaDB every 5 minutes
- **Full Initial Sync**: Populate ChromaDB with all existing data
- **Extensible Configuration**: Easy to add new tables and fields for syncing
- **REST API**: HTTP endpoints for manual sync operations
- **Text Chunking**: Automatically chunks large text content for better search performance

## Currently Synced Data

### CWU Opportunity Versions
- **Table**: `cwuOpportunityVersions`
- **Content Field**: `description`
- **Features**: Only syncs the latest version of each opportunity
- **Status Filtering**: Only syncs opportunities that are NOT in `DRAFT` or `CANCELED` status
- **Metadata Included**: title, teaser, location, reward, skills, opportunity_id, status

## Status Filtering

The sync service automatically filters opportunities based on their status to ensure only appropriate content is indexed:

### CWU Opportunities
- **Excluded Statuses**: `DRAFT`, `CANCELED`
- **Included Statuses**: `PUBLISHED`, `EVALUATION`, `AWARDED`, `SUSPENDED`, `UNDER_REVIEW`
- **Rationale**: Draft opportunities are not ready for public search, and canceled opportunities are no longer relevant

### Status Logic
- Uses the latest status for each opportunity from `cwuOpportunityStatuses` table
- Status is included in metadata for each document chunk
- Status changes trigger re-sync during incremental updates

## API Endpoints

### Sync Operations
- `POST /sync/full` - Perform a full sync of all data
- `POST /sync/incremental` - Perform incremental sync (last 5 minutes)
- `POST /sync/source/cwuOpportunityVersions?incremental=false` - Sync specific source

### Management
- `GET /sync/health` - Check sync service health
- `GET /sync/configs` - View current sync configurations
- `POST /sync/configs/cwuOpportunityVersions/toggle?enabled=true` - Enable/disable sync for a source

### Search
- `GET /rag/search?q=your-search-query` - Search through synced content

## Initial Setup

1. **Environment Variables**: Ensure `POSTGRES_URL` and `CHROMA_URL` are set
2. **Initial Population**: Run full sync to populate ChromaDB
   ```bash
   curl -X POST http://localhost:3000/sync/full
   ```
3. **Verify**: Check that data was synced
   ```bash
   curl http://localhost:3000/sync/health
   ```

## Adding New Data Sources

To add a new table/field for syncing, add a new configuration to `SYNC_CONFIGS` in `chroma-sync.service.ts`:

```typescript
newDataSource: {
  table: 'your_table_name',
  fields: {
    id: 'id',
    content: 'content_field',
    updatedAt: 'updated_at',
    metadata: ['field1', 'field2', 'table2.field as alias']
  },
  query: {
    joins: 'LEFT JOIN related_table ON ...',
    where: 'content_field IS NOT NULL',
    orderBy: 'updated_at DESC'
  },
  chunkSize: 500,
  enabled: true
}
```

## Configuration Options

- **table**: Database table name
- **fields.id**: Primary key field
- **fields.content**: Text field to be indexed
- **fields.updatedAt**: Timestamp field for incremental sync
- **fields.metadata**: Additional fields to include as metadata
- **query.joins**: SQL JOIN clauses
- **query.where**: Additional WHERE conditions
- **query.orderBy**: ORDER BY clause
- **chunkSize**: Words per chunk (default: 500)
- **enabled**: Whether this source is active

## Search Usage

The synced data can be searched using semantic similarity:

```bash
# Search for opportunities related to "web development"
curl "http://localhost:3000/rag/search?q=web%20development"
```

Results include:
- Matched content chunks
- Similarity scores
- Source metadata (title, location, etc.)
- Original opportunity information

## Monitoring

- Check `/sync/health` for service status
- Monitor logs for sync operations
- Automatic retry on failures (continues with next records)
- Configurable sync intervals via cron expressions
