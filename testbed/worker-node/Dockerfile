FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && \
    apt-get install -y curl sudo wget gnupg2 ca-certificates && \
    apt-get clean

# Install Tailscale (binary only, do not run now)
RUN curl -fsSL https://tailscale.com/install.sh | sh

# Install MinIO server
RUN wget https://dl.min.io/server/minio/release/linux-amd64/minio && \
    chmod +x minio && mv minio /usr/local/bin/

# Create MinIO data folder
RUN mkdir -p /data/minio

# Copy backend scripts
COPY backend/ /opt/backend/

# Copy start script
COPY start-worker.sh /opt/start-worker.sh
RUN chmod +x /opt/start-worker.sh

# Run start script at container runtime
CMD ["/opt/start-worker.sh"]