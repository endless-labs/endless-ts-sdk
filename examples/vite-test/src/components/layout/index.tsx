import { ReactNode, useMemo, useState, useEffect } from 'react'
import { Button, Layout, Nav, Typography } from '@douyinfe/semi-ui'
import { useLocation } from 'react-router-dom'
import { IconMoon, IconSun } from '@douyinfe/semi-icons'

const items = [
  {
    itemKey: '1',
    text: 'Home',
    link: '/'
  },
  {
    itemKey: '2',
    text: 'About',
    items: [
      {
        itemKey: '2-1',
        text: 'About 1',
        link: '/about'
      }
    ]
  },
]

const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const { Sider, Content } = Layout
  const [ mode, setMode ] = useState(localStorage.getItem('theme-mode') || 'light')
  const location = useLocation()
  const { Title } = Typography

  const siderStyle = {
    maxWidth: '220px',
    height: '100vh',
    borderRight: '1px solid var(--semi-color-border)',
  }

  const navStyle = {
    maxWidth: '220px',
    height: '100%'
  }

  const footerStyle ={
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 16px',
    height: '48px',
    width: '100%',
  }

  const selectedKeys = useMemo((): string[] => {
    const pathname = location.pathname
    let selectedKeys: string[] = []
    
    items.forEach(item => {
      if( item.link === pathname ) {
        selectedKeys = [ item.itemKey ]
      }else if(item.items) {
        item.items.forEach(subItem => {
          if( subItem.link === pathname ) {
            selectedKeys = [ subItem.itemKey ]
          }
        })
      }
    })
    return selectedKeys
  }, [ location ])

  const changeModeHandler = () => {
    setMode( mode === 'light' ? 'dark' : 'light' )
  }

  useEffect(() => {
    const body = document.body
    if(mode === 'light') {
      body.removeAttribute('theme-mode')
      localStorage.setItem('theme-mode', 'light')
    }else {
      body.setAttribute('theme-mode', 'dark')
      localStorage.setItem('theme-mode', 'dark')
    }
  }, [ mode ])

  return (
    <Layout>
      <Sider style={ siderStyle }>
        <Nav
          style={ navStyle }
          selectedKeys={ selectedKeys }
          items={ items }
          header={
            <div>
              <Title heading={2}>Endless Demo</Title>
              
            </div>
          }
          
          footer={{
            collapseButton: true,
            children: (
              <div style={ footerStyle }>
                <Button
                  icon={ mode === 'light' ? <IconMoon /> : <IconSun /> }
                  type={ mode === 'light' ? 'secondary' : 'primary' }
                  onClick={ changeModeHandler }
                />
                <div>123123</div>
              </div>
              
            )
          }}
        />
        
      </Sider>
      <Content>
        { children}
      </Content>
    </Layout>
  )
}

export default LayoutComponent
