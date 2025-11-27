# Ant Media Server Container Setup Instructions

## Prerequisites

- Docker and Docker Compose installed on your system.
- Local copy of Ant Media Server distribution under `./ant-media-server` directory.
- Project contains `Dockerfile.antmedia` and a `docker-compose.yml` with the antmedia service definition.

## Steps

1. **Build the Ant Media Server Docker Image**

```bash
docker build -t hcf-antmedia-image -f Dockerfile.antmedia .
```

2. **Start the Ant Media Server Container Using Docker Compose**

```bash
docker-compose up -d antmedia
```

This will build (if needed) and start the antmedia container as per the docker-compose.yml service definition.

3. **Port Mapping**

- HTTP Dashboard: `http://localhost:5080`
- RTMP Stream: Uses port `1936` externally mapped to container's port `1935`.
- HTTPS Dashboard (if configured): Port `5443`
- UDP Ports 50000-50100 are open for WebRTC functionality.

4. **Persistence**

The container uses Docker volumes to persist application data and logs:

- Application data: persisted in volume `antmedia_apps` at `/usr/local/antmedia/webapps`
- Logs: persisted in volume `antmedia_logs` at `/usr/local/antmedia/logs`

5. **Managing the Container**

- To stop the container: `docker-compose stop antmedia`
- To start it again: `docker-compose start antmedia`
- To see logs: `docker-compose logs -f antmedia`

6. **Additional Configuration**

- You may configure Ant Media Server by modifying files inside the volumes or through the dashboard.
- Restart policies ensure the container restarts on failure unless stopped manually.

## Notes

- Make sure your local `./ant-media-server` directory contains the necessary server files as this is copied during the image build.
- Adjust firewall or security settings to allow access to exposed ports as needed.

---

This documentation provides a straightforward way to build and run Ant Media Server in a container using the provided Dockerfile and docker-compose setup.
