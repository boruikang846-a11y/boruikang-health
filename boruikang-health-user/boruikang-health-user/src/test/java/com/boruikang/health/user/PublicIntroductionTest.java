package com.boruikang.health.user;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.datasource.url=jdbc:h2:mem:health-introduction;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "logging.level.root=WARN"
})
class PublicIntroductionTest {
    @Value("${local.server.port}") int port;
    private final HttpClient client=HttpClient.newHttpClient();
    private HttpResponse<String> get(String path) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).GET().build(),HttpResponse.BodyHandlers.ofString());
    }
    @Test void publicIntroductionIsAccessibleWithoutAnAccount() throws Exception {
        var response=get("/");
        assertEquals(200,response.statusCode());
        assertTrue(response.body().contains("博瑞康 Health"));
        assertEquals(200,get("/join/demo-channel").statusCode());
        assertEquals(404,get("/login").statusCode());
        assertEquals(404,get("/patients/1001").statusCode());
    }
    @Test void patientBusinessApisAreNotExposed() throws Exception {
        for(String path:new String[]{"/boruikang/user/me","/boruikang/user/profile","/boruikang/user/channels/demo-channel"})
            assertEquals(404,get(path).statusCode(),path);
        for(String path:new String[]{"/login","/register","/enroll","/observations/create","/messages/create"}) {
            var response=client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/boruikang/user"+path))
                .header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString("{}")).build(),HttpResponse.BodyHandlers.ofString());
            assertEquals(404,response.statusCode(),path);
        }
    }
    @Test void healthEndpointIsLiveAndApiMissDoesNotReturnSpaHtml() throws Exception {
        assertEquals(200,get("/boruikang/health/liveness").statusCode());
        var miss=get("/boruikang/user/unknown");
        assertEquals(404,miss.statusCode());
        assertFalse(miss.body().contains("<!doctype"));
    }
}
