# control-plane/Dockerfile
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && \
    apt-get install -y curl wget git sudo gnupg2 ca-certificates nodejs npm python3 && \
    apt-get clean

# Install Tailscale
RUN curl -fsSL https://tailscale.com/install.sh | sh

# Install MinIO client (mc) to push files to worker MinIO
RUN wget https://dl.min.io/client/mc/release/linux-amd64/mc && \
    chmod +x mc && mv mc /usr/local/bin/

# Copy backend and start script
COPY backend/ /opt/backend/
COPY start-control.sh /opt/start-control.sh
RUN chmod +x /opt/start-control.sh

# Copy frontend (HTML/JS)
COPY public/ /opt/public/

CMD ["/opt/start-control.sh"]