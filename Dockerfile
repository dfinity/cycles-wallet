FROM ubuntu:focal

ENV DEBIAN_FRONTEND noninteractive

### Install baseline packages.
RUN apt-get update
RUN apt-get install -y build-essential cmake git sudo wget

# Create development user.
RUN groupadd developer
RUN useradd -d /home/developer -g developer -m developer

# Enable passwordless sudo privileges.
RUN echo developer ALL=NOPASSWD:ALL > /etc/sudoers.d/developer
RUN chmod 440 /etc/sudoers.d/developer
RUN echo Set disable_coredump false > /etc/sudo.conf

# Become development user.
USER developer

### Install Rust toolchain.
ARG RUSTUP_VERSION=1.22.1
ARG RUSTUP_DIR=rustup-${RUSTUP_VERSION}
ARG RUSTUP_TARBALL=${RUSTUP_VERSION}.tar.gz
WORKDIR /tmp
RUN wget https://github.com/rust-lang/rustup/archive/${RUSTUP_TARBALL}
RUN tar -f ${RUSTUP_TARBALL} -x
RUN sh ${RUSTUP_DIR}/rustup-init.sh -y
ENV PATH "/home/developer/.cargo/bin:${PATH}"
RUN rustup target add wasm32-unknown-unknown
RUN rm -r ${RUSTUP_DIR} ${RUSTUP_TARBALL}

# Install DFINITY SDK.
RUN wget -O install-dfx.sh -q https://sdk.dfinity.org/install.sh
RUN yes Y | DFX_VERSION=0.6.10 bash install-dfx.sh
RUN rm install-dfx.sh
ENV PATH "/home/developer/bin:${PATH}"

# Install Node.
RUN wget -O install-node.sh -q https://deb.nodesource.com/setup_12.x
RUN sudo bash install-node.sh
RUN sudo apt-get install -y nodejs
RUN npm install

# Create development workspace.
WORKDIR /workspace
RUN sudo chown -R developer:developer .
