FROM node:18-slim

# Install Python and necessary dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    protobuf-compiler \
    libnl-route-3-dev \
    libtool \
    autoconf \
    pkg-config \
    git \
    libprotobuf-dev \
    bison \
    flex \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install nsjail
WORKDIR /tmp
RUN git clone https://github.com/google/nsjail.git \
    && cd nsjail \
    && make \
    && cp nsjail /usr/local/bin/ \
    && cd .. \
    && rm -rf nsjail

# Create and activate Python virtual environment
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# Install required Python packages in the virtual environment
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir pandas numpy

# Set up work directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Configure environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV PYTHON_PATH=/app/venv/bin/python3
ENV NSJAIL_CONFIG_PATH=/app/config/nsjail_config.proto
ENV WORKSPACE_DIR=/app/workspace
ENV PORT=3000

# Create workspace directory
RUN mkdir -p /app/workspace && chmod 777 /app/workspace

# Copy the source code
COPY . .

# Start the development server
CMD ["npm", "run", "dev"]