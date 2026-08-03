package com.cristian.nbastats.player;

public class WriteOperationsDisabledException extends RuntimeException {

    public WriteOperationsDisabledException() {
        super("Player write operations are disabled.");
    }
}
