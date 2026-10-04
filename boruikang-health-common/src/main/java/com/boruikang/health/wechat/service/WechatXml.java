package com.boruikang.health.wechat.service;
import com.boruikang.health.common.exception.BizException;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.IOException;
import java.io.StringReader;
import java.util.HashMap;
import java.util.Map;
/** Flat WeChat callback XML to a map. DTDs and external entities are refused. */
public final class WechatXml {
    private WechatXml() {}
    public static Map<String,String> parse(String xml) {
        try {
            DocumentBuilderFactory factory=DocumentBuilderFactory.newInstance();
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING,true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities",false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities",false);
            factory.setXIncludeAware(false);factory.setExpandEntityReferences(false);
            DocumentBuilder builder=factory.newDocumentBuilder();builder.setErrorHandler(null);
            NodeList nodes=builder.parse(new InputSource(new StringReader(xml))).getDocumentElement().getChildNodes();
            Map<String,String> values=new HashMap<>();
            for(int i=0;i<nodes.getLength();i++) { Node node=nodes.item(i);if(node instanceof Element element)values.put(element.getTagName(),element.getTextContent()); }
            return values;
        } catch(ParserConfigurationException|SAXException|IOException|RuntimeException ex) { throw new BizException("50000001","Invalid callback body / 回调内容无法解析"); }
    }
}
