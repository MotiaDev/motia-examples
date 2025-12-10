# Motia Docker Example

This is an example of a Motia project that can be run in a Docker container.

## Prerequisites

- Docker
- Docker Compose
- Motia CLI

## Installation

```bash
pnpm i
```

## Run in local environment

```bash
pnpm dev
```

## Run in local environment with docker

```bash
make dev
```

## Deploy to AWS Lightsail

This example is using AWS Lightsail to deploy the container. It is up to you to decide which cloud provider fits best for your needs. 

> 💡 AWS Lightsail is just used as an example and not a requirement to use motia-docker

### Prerequisites

- Docker
- [AWS CLI](https://aws.amazon.com/cli/) (setup your credentials, the `default` profile will be used if no `AWS_PROFILE` is provided in the `make full-deploy` command)
- [AWS Lightsail Plugin](https://docs.aws.amazon.com/en_us/lightsail/latest/userguide/amazon-lightsail-install-software.html#install-software-lightsailctl)

Follow [these](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) instructions to install these dependencies.

### Quick deployment with defaults
```bash
make full-deploy
```

### Or customize for your specific setup
```bash
make full-deploy SERVICE_NAME=your-service AWS_REGION=your-region IMAGE_NAME=your-app
```

### Use a specific aws profile

```bash
make full-deploy AWS_PROFILE=your-profile
```

### Get the deployed service status

```bash
make status
```

### Get the deployed service logs

```bash
make logs
```


## Deploy to Railway

### Prerequisites

- Docker
- Railway CLI

### Link to a project

```bash
railway link
```

### Update Dockerfile

Remove this line from the Dockerfile `CMD ["npm", "run", "dev"]` since this is already configured in the railway.json file

### Deploy

```bash
railway up
```

### After your deployment completes, make sure to perform the following steps:

- Setup a domain and configure it to point to the exposed PORT in your Dockerfile
- Configure the environment variables in Railway

