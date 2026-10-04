package com.bgssai.health.wechat.service;
import com.bgssai.health.common.exception.BizException;
import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
/** Callback signature and message encryption shared by WeCom and Official Account (AES-256-CBC, PKCS#7 over 32-byte blocks). */
public final class WechatCrypto {
    private static final SecureRandom RANDOM=new SecureRandom();
    private WechatCrypto() {}
    public static String sha1(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch(GeneralSecurityException ex) { throw new IllegalStateException(ex); }
    }
    /** SHA-1 over the lexicographically sorted parts joined without a separator. */
    public static String signature(String... parts) { String[] sorted=parts.clone();Arrays.sort(sorted);return sha1(String.join("",sorted)); }
    /** Constant-time comparison; a missing parameter never matches. */
    public static boolean matches(String expected,String actual) {
        return expected!=null&&actual!=null&&MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),actual.getBytes(StandardCharsets.UTF_8));
    }
    public static boolean validKey(String aesKey) {
        try { return aesKey!=null&&aesKey.matches("[A-Za-z0-9]{43}")&&key(aesKey).length==32; } catch(IllegalArgumentException ex) { return false; }
    }
    /** Returns the message; fails when padding, length or the receiving corp id / app id does not match. */
    public static String decrypt(String aesKey,String receiveId,String encrypted) {
        try {
            byte[] key=key(aesKey);Cipher cipher=Cipher.getInstance("AES/CBC/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(key,"AES"),new IvParameterSpec(key,0,16));
            byte[] plain=cipher.doFinal(Base64.getDecoder().decode(encrypted));
            if(plain.length<32)throw invalid();
            int pad=plain[plain.length-1];
            if(pad<1||pad>32||plain.length-pad<20)throw invalid();
            int length=ByteBuffer.wrap(plain,16,4).getInt();
            if(length<0||20+length>plain.length-pad)throw invalid();
            String id=new String(plain,20+length,plain.length-pad-20-length,StandardCharsets.UTF_8);
            if(!id.equals(receiveId))throw invalid();
            return new String(plain,20,length,StandardCharsets.UTF_8);
        } catch(GeneralSecurityException|IllegalArgumentException ex) { throw invalid(); }
    }
    public static String encrypt(String aesKey,String receiveId,String message) {
        try {
            byte[] key=key(aesKey),random=new byte[16],body=message.getBytes(StandardCharsets.UTF_8),id=receiveId.getBytes(StandardCharsets.UTF_8);
            RANDOM.nextBytes(random);int size=20+body.length+id.length,pad=32-size%32;
            ByteBuffer buffer=ByteBuffer.allocate(size+pad);buffer.put(random).putInt(body.length).put(body).put(id);
            for(int i=0;i<pad;i++)buffer.put((byte)pad);
            Cipher cipher=Cipher.getInstance("AES/CBC/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(key,"AES"),new IvParameterSpec(key,0,16));
            return Base64.getEncoder().encodeToString(cipher.doFinal(buffer.array()));
        } catch(GeneralSecurityException ex) { throw new IllegalStateException(ex); }
    }
    private static byte[] key(String aesKey) { return Base64.getDecoder().decode(aesKey+"="); }
    private static BizException invalid() { return new BizException("4003","Invalid callback / 回调校验失败"); }
}
