package com.example.agent.security;
import javax.crypto.*;
import javax.crypto.spec.*;
import java.security.*;
import java.util.Base64;
/**
 * AES-GCM helper for recoverable third-party secrets.
 * Supply a base64-encoded, randomly generated 32-byte key via APP_ENCRYPTION_KEY.
 * Production deployments should use KMS envelope encryption instead.
 */
public final class CredentialCrypto {
 private CredentialCrypto(){}
 public static String encrypt(String plaintext,String base64Key) {
  try {
   byte[] key=Base64.getDecoder().decode(base64Key);
   if(key.length!=32) throw new IllegalArgumentException("Encryption key must decode to exactly 32 bytes");
   byte[] iv=new byte[12]; SecureRandom.getInstanceStrong().nextBytes(iv);
   Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
   cipher.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,iv));
   byte[] encrypted=cipher.doFinal(plaintext.getBytes(java.nio.charset.StandardCharsets.UTF_8));
   byte[] combined=new byte[iv.length+encrypted.length]; System.arraycopy(iv,0,combined,0,iv.length); System.arraycopy(encrypted,0,combined,iv.length,encrypted.length);
   return Base64.getEncoder().encodeToString(combined);
  } catch(GeneralSecurityException e){throw new IllegalStateException("Secret encryption failed",e);}
 }
 public static String decrypt(String encoded,String base64Key) {
  try {
   byte[] key=Base64.getDecoder().decode(base64Key), all=Base64.getDecoder().decode(encoded);
   if(key.length!=32 || all.length<29) throw new IllegalArgumentException("Invalid encrypted secret or key");
   byte[] iv=java.util.Arrays.copyOfRange(all,0,12), data=java.util.Arrays.copyOfRange(all,12,all.length);
   Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
   cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,iv));
   return new String(cipher.doFinal(data),java.nio.charset.StandardCharsets.UTF_8);
  } catch(GeneralSecurityException e){throw new IllegalStateException("Secret decryption failed",e);}
 }
}
