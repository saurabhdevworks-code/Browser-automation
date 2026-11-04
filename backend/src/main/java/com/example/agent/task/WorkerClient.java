package com.example.agent.task;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.*;
@Component
public class WorkerClient {
 private final RestClient client;
 public WorkerClient(@Value("${app.worker-url}") String url){this.client=RestClient.builder().baseUrl(url).build();}
    public Map<?,?> inspect(String url,String prompt){return client.post().uri("/v1/inspect").body(Map.of("url",url,"task",prompt)).retrieve().body(Map.class);}
    public Map<?,?> launchLogin(String url){return client.post().uri("/v1/launch-login").body(Map.of("url",url)).retrieve().body(Map.class);}
    public Map<?,?> confirmLogin(){return client.post().uri("/v1/confirm-login").retrieve().body(Map.class);}
    public Map<?,?> cancelLogin(){return client.post().uri("/v1/cancel-login").retrieve().body(Map.class);}
}
