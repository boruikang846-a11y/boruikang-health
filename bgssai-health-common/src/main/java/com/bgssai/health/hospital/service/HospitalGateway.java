package com.bgssai.health.hospital.service;
import com.bgssai.health.hospital.dto.HospitalBatchResponse;
/** Hospital contract boundary. Real hospital adapters will replace the explicit Mock provider. */
public interface HospitalGateway {
    HospitalBatchResponse fetch(String scenario);
    boolean mockEnabled();
}
